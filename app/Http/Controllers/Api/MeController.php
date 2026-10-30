<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Entry;
use App\Models\UserList;
use App\Models\UserMarker;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Personal tracking for signed-in users. Every query is scoped to $request->user(),
 * so users can never read or modify another user's records.
 */
class MeController extends Controller
{
    public function state(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'favorites' => $user->favorites()->pluck('entries.id'),
            'progress' => $user->progress()->pluck('entries.id'),
            'markers' => $user->markers()->latest()->get(['id', 'x', 'y', 'label', 'note', 'color']),
            'lists' => $user->lists()->with('entries:id')->get()->map(fn (UserList $l) => ['id' => $l->id, 'name' => $l->name, 'entries' => $l->entries->pluck('id')]),
        ]);
    }

    private function publishedEntry(int $id): Entry
    {
        return Entry::published()->findOrFail($id);
    }

    public function toggleFavorite(Request $request, int $entry): JsonResponse
    {
        $e = $this->publishedEntry($entry);
        $result = $request->user()->favorites()->toggle($e->id);

        return response()->json(['favorite' => count($result['attached']) > 0]);
    }

    public function toggleProgress(Request $request, int $entry): JsonResponse
    {
        $e = $this->publishedEntry($entry);
        abort_unless(config("atlas.types.{$e->type}.trackable"), 422, 'This entry type cannot be tracked.');
        $result = $request->user()->progress()->toggle([$e->id => ['state' => 'done']]);

        return response()->json(['done' => count($result['attached']) > 0]);
    }

    /** Explicit migration of anonymous, browser-stored progress into the account. */
    public function import(Request $request): JsonResponse
    {
        $data = $request->validate([
            'favorites' => ['array', 'max:2000'],
            'favorites.*' => ['integer'],
            'progress' => ['array', 'max:5000'],
            'progress.*' => ['integer'],
            'markers' => ['array', 'max:200'],
            'markers.*.x' => ['required', 'numeric', 'between:0,1'],
            'markers.*.y' => ['required', 'numeric', 'between:0,1'],
            'markers.*.label' => ['required', 'string', 'max:80'],
            'markers.*.note' => ['nullable', 'string', 'max:500'],
        ]);
        $user = $request->user();
        $valid = Entry::published()->whereIn('id', array_merge($data['favorites'] ?? [], $data['progress'] ?? []))->pluck('type', 'id');

        $favorites = collect($data['favorites'] ?? [])->filter(fn ($id) => $valid->has($id))->unique();
        $user->favorites()->syncWithoutDetaching($favorites->all());

        $progress = collect($data['progress'] ?? [])->filter(fn ($id) => $valid->has($id) && config('atlas.types.'.$valid[$id].'.trackable'))->unique();
        $user->progress()->syncWithoutDetaching($progress->mapWithKeys(fn ($id) => [$id => ['state' => 'done']])->all());

        $existing = $user->markers()->count();
        foreach (array_slice($data['markers'] ?? [], 0, max(0, 200 - $existing)) as $m) {
            $user->markers()->create($m);
        }

        return response()->json(['imported' => ['favorites' => $favorites->count(), 'progress' => $progress->count(), 'markers' => count($data['markers'] ?? [])]]);
    }

    public function storeMarker(Request $request): JsonResponse
    {
        abort_if($request->user()->markers()->count() >= 200, 422, 'Marker limit reached.');
        $data = $request->validate([
            'x' => ['required', 'numeric', 'between:0,1'],
            'y' => ['required', 'numeric', 'between:0,1'],
            'label' => ['required', 'string', 'max:80'],
            'note' => ['nullable', 'string', 'max:500'],
            'color' => ['nullable', Rule::in(['pink', 'blue', 'orange', 'violet'])],
        ]);

        return response()->json(['marker' => $request->user()->markers()->create($data)], 201);
    }

    public function destroyMarker(Request $request, int $marker): JsonResponse
    {
        UserMarker::where('user_id', $request->user()->id)->findOrFail($marker)->delete();

        return response()->json(['deleted' => true]);
    }

    public function storeList(Request $request): JsonResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:80']]);
        abort_if($request->user()->lists()->count() >= 50, 422, 'List limit reached.');

        return response()->json(['list' => $request->user()->lists()->create($data)], 201);
    }

    public function toggleListItem(Request $request, int $list, int $entry): JsonResponse
    {
        $l = UserList::where('user_id', $request->user()->id)->findOrFail($list);
        $e = $this->publishedEntry($entry);
        $result = $l->entries()->toggle($e->id);

        return response()->json(['in_list' => count($result['attached']) > 0]);
    }

    public function destroyList(Request $request, int $list): JsonResponse
    {
        UserList::where('user_id', $request->user()->id)->findOrFail($list)->delete();

        return response()->json(['deleted' => true]);
    }
}
