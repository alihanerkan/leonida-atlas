<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\EntryPresenter;
use App\Services\SearchService;
use App\Support\Locales;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Read-only public API. Only published entries and published translations are exposed. */
class PublicApiController extends Controller
{
    private function locale(Request $request): string
    {
        $locale = $request->query('locale');
        $locale = Locales::isValid($locale) ? $locale : config('atlas.default_locale');
        app()->setLocale($locale);

        return $locale;
    }

    public function search(Request $request, SearchService $search): JsonResponse
    {
        $request->validate([
            'q' => ['required', 'string', 'min:2', 'max:100'],
            'section' => ['nullable', Rule::in(array_keys(config('atlas.content_sections')))],
            'limit' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);
        $locale = $this->locale($request);

        return response()->json([
            'data' => $search->search($request->string('q'), $locale, $request->query('section'), $request->integer('limit', 12)),
        ]);
    }

    public function entries(Request $request): JsonResponse
    {
        $request->validate([
            'type' => ['nullable', Rule::in(array_keys(config('atlas.types')))],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
            'ids' => ['nullable', 'string', 'max:2000', 'regex:/^[0-9,]+$/'],
        ]);
        $locale = $this->locale($request);
        $query = EntryPresenter::publicQuery()->orderBy('type')->orderBy('sort_order');
        if ($request->filled('ids')) {
            $query->whereIn('id', array_slice(array_filter(array_map('intval', explode(',', $request->query('ids')))), 0, 200));
        }
        if ($request->filled('type')) {
            $query->where('type', $request->query('type'));
        }
        $page = $query->paginate($request->integer('per_page', 24));

        return response()->json([
            'data' => EntryPresenter::cards($page->items(), $locale),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()],
        ]);
    }

    public function entry(Request $request, int $id): JsonResponse
    {
        $locale = $this->locale($request);
        $entry = EntryPresenter::publicQuery()->findOrFail($id);

        return response()->json(['data' => EntryPresenter::full($entry, $locale)]);
    }
}
