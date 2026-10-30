<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Entry;
use App\Models\MapMarker;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class MapEditorController extends Controller
{
    public function index(): Response
    {
        Gate::authorize('map.edit');
        $markers = MapMarker::with('entry.translations')->get();

        // Validation report: entries placed twice in the same category, and regions/locations without markers.
        $duplicates = $markers->groupBy(fn ($m) => $m->entry_id.'-'.$m->category)->filter(fn ($g) => $g->count() > 1)->keys();
        $closePairs = [];
        $list = $markers->values();
        for ($i = 0; $i < $list->count(); $i++) {
            for ($j = $i + 1; $j < $list->count(); $j++) {
                if (abs($list[$i]->x - $list[$j]->x) < 0.004 && abs($list[$i]->y - $list[$j]->y) < 0.004) {
                    $closePairs[] = [$list[$i]->id, $list[$j]->id];
                }
            }
        }
        $unplaced = Entry::whereIn('type', ['region', 'location'])->whereDoesntHave('markers')->with('translations')->get()
            ->map(fn ($e) => ['id' => $e->id, 'title' => $e->label('en'), 'type' => $e->type]);

        return Inertia::render('admin/map', [
            'markers' => $markers->map(fn (MapMarker $m) => [
                'id' => $m->id,
                'entry_id' => $m->entry_id,
                'entry_title' => $m->entry?->label('en'),
                'entry_type' => $m->entry?->type,
                'entry_status' => $m->entry?->status,
                'category' => $m->category,
                'x' => $m->x,
                'y' => $m->y,
                'precision' => $m->precision,
                'basis' => $m->approximation_basis,
                'zoom' => $m->zoom,
                'status' => $m->status,
            ]),
            'categories' => config('atlas.marker_categories'),
            'report' => ['duplicates' => $duplicates, 'overlapping' => $closePairs, 'unplaced' => $unplaced],
        ]);
    }

    private function rules(): array
    {
        return [
            'entry_id' => ['required', 'integer', Rule::exists('entries', 'id')->whereNull('deleted_at')],
            'category' => ['required', Rule::in(config('atlas.marker_categories'))],
            'x' => ['required', 'numeric', 'between:0,1'],
            'y' => ['required', 'numeric', 'between:0,1'],
            'precision' => ['required', Rule::in(['confirmed', 'approximate'])],
            'basis' => ['required_if:precision,approximate', 'nullable', 'string', 'max:1000'],
            'zoom' => ['required', 'integer', 'between:1,6'],
            'status' => ['required', Rule::in(['draft', 'published'])],
        ];
    }

    public function store(Request $request): RedirectResponse
    {
        Gate::authorize('map.edit');
        $data = $request->validate($this->rules());
        $marker = MapMarker::create([...collect($data)->except('basis')->all(), 'approximation_basis' => $data['basis'] ?? null, 'updated_by' => $request->user()->id]);
        Audit::log('marker.created', $marker->entry, ['marker' => $marker->id]);

        return back()->with('success', 'Marker added.');
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        Gate::authorize('map.edit');
        $marker = MapMarker::findOrFail($id);
        $data = $request->validate($this->rules());
        $marker->update([...collect($data)->except('basis')->all(), 'approximation_basis' => $data['basis'] ?? null, 'updated_by' => $request->user()->id]);
        Audit::log('marker.updated', $marker->entry, ['marker' => $marker->id, 'x' => $marker->x, 'y' => $marker->y]);

        return back()->with('success', 'Marker saved.');
    }

    public function destroy(int $id): RedirectResponse
    {
        Gate::authorize('map.edit');
        $marker = MapMarker::findOrFail($id);
        $marker->delete();
        Audit::log('marker.deleted', $marker->entry, ['marker' => $id]);

        return back()->with('success', 'Marker removed.');
    }

    public function export(): JsonResponse
    {
        Gate::authorize('map.edit');
        $data = MapMarker::with('entry:id,key')->get()->map(fn ($m) => [
            'entry' => $m->entry?->key, 'category' => $m->category, 'x' => $m->x, 'y' => $m->y,
            'precision' => $m->precision, 'basis' => $m->approximation_basis, 'zoom' => $m->zoom, 'status' => $m->status,
        ]);

        return response()->json(['format' => 'leonida-atlas.markers.v1', 'markers' => $data], 200, [
            'Content-Disposition' => 'attachment; filename="leonida-atlas-markers.json"',
        ]);
    }

    public function import(Request $request): RedirectResponse
    {
        Gate::authorize('map.edit');
        $request->validate(['file' => ['required', 'file', 'mimetypes:application/json,text/plain', 'max:2048']]);
        $json = json_decode(file_get_contents($request->file('file')->getRealPath()), true);
        if (! is_array($json) || ($json['format'] ?? null) !== 'leonida-atlas.markers.v1' || ! is_array($json['markers'] ?? null)) {
            return back()->with('error', 'Invalid file: expected format leonida-atlas.markers.v1.');
        }
        $keys = Entry::pluck('id', 'key');
        $errors = [];
        $valid = [];
        foreach ($json['markers'] as $i => $m) {
            $v = validator($m, [
                'entry' => ['required', 'string'],
                'category' => ['required', Rule::in(config('atlas.marker_categories'))],
                'x' => ['required', 'numeric', 'between:0,1'],
                'y' => ['required', 'numeric', 'between:0,1'],
                'precision' => ['required', Rule::in(['confirmed', 'approximate'])],
                'zoom' => ['nullable', 'integer', 'between:1,6'],
                'status' => ['nullable', Rule::in(['draft', 'published'])],
            ]);
            if ($v->fails() || ! isset($keys[$m['entry'] ?? ''])) {
                $errors[] = "#$i ".($v->errors()->first() ?: 'unknown entry key');

                continue;
            }
            $valid[] = $m;
        }
        if ($errors) {
            return back()->with('error', 'Import aborted, nothing saved. '.count($errors).' invalid rows: '.implode('; ', array_slice($errors, 0, 5)));
        }
        DB::transaction(function () use ($valid, $keys, $request) {
            foreach ($valid as $m) {
                MapMarker::updateOrCreate(
                    ['entry_id' => $keys[$m['entry']], 'category' => $m['category']],
                    ['x' => $m['x'], 'y' => $m['y'], 'precision' => $m['precision'], 'approximation_basis' => $m['basis'] ?? null, 'zoom' => $m['zoom'] ?? 2, 'status' => $m['status'] ?? 'draft', 'updated_by' => $request->user()->id],
                );
            }
        });
        Audit::log('marker.imported', null, ['count' => count($valid)], 'Map import');

        return back()->with('success', count($valid).' markers imported.');
    }
}
