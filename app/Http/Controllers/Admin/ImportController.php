<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\ContentImporter;
use App\Support\Audit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/** Structured import of researched records. Imported entries always land as drafts for editorial review. */
class ImportController extends Controller
{
    public function show(): Response
    {
        Gate::authorize('content.create');

        return Inertia::render('admin/import', [
            'example' => [
                'format' => 'leonida-atlas.entries.v1',
                'sources' => ['example_source' => ['title' => 'Source title', 'url' => 'https://example.com/article', 'publisher' => 'Publisher', 'type' => 'press', 'published' => '2026-10-01']],
                'entries' => [[
                    'key' => 'example-entry', 'type' => 'location', 'verification' => 'reported', 'confidence' => 'medium',
                    'sources' => ['example_source' => 'What this source supports'],
                    't' => ['en' => ['title' => 'Example Entry', 'summary' => 'One-sentence summary.', 'body' => 'Longer text.']],
                ]],
            ],
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Gate::authorize('content.create');
        $request->validate(['file' => ['required', 'file', 'mimetypes:application/json,text/plain', 'max:4096']]);
        $json = json_decode(file_get_contents($request->file('file')->getRealPath()), true);
        if (! is_array($json) || ($json['format'] ?? null) !== 'leonida-atlas.entries.v1' || ! is_array($json['entries'] ?? null)) {
            return back()->with('error', 'Invalid file: expected format leonida-atlas.entries.v1.');
        }
        foreach ($json['entries'] as $i => $entry) {
            if (! is_array($entry)) {
                return back()->with('error', "Entry #$i is not an object.");
            }
            unset($json['entries'][$i]['status'], $json['entries'][$i]['featured']);
            foreach (($entry['t'] ?? []) as $locale => $t) {
                $json['entries'][$i]['t'][$locale]['status'] = 'draft';
            }
            try {
                ContentImporter::validateEntry($json['entries'][$i]);
            } catch (ValidationException $e) {
                return back()->with('error', "Import aborted, nothing saved. Entry #$i: ".collect($e->errors())->flatten()->first());
            }
        }

        $importer = new ContentImporter($request->user()->id, machineForNonSource: false);
        $importer->importSources($json['sources'] ?? []);
        $importer->importEntries($json['entries'], status: 'draft');
        Audit::log('content.imported', null, $importer->stats, 'JSON import');

        return back()->with('success', "Imported {$importer->stats['entries']} entries as drafts.");
    }
}
