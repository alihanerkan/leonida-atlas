<?php

namespace Tests\Concerns;

use App\Models\Entry;
use App\Services\ContentImporter;
use App\Support\Settings;
use Database\Seeders\AtlasContentSeeder;
use Illuminate\Support\Facades\Cache;

trait SeedsAtlas
{
    protected function seedAtlas(): void
    {
        Cache::forget('atlas.settings');
        $this->seed(AtlasContentSeeder::class);
        Settings::put([]);
    }

    /** Minimal published entry with an English source translation. */
    protected function makeEntry(string $key, string $type = 'location', array $overrides = [], array $translations = []): Entry
    {
        $importer = new ContentImporter;
        $importer->importEntries([array_merge([
            'key' => $key,
            'type' => $type,
            'verification' => 'official',
            't' => $translations ?: ['en' => ['title' => ucwords(str_replace('-', ' ', $key)), 'summary' => "Summary for $key", 'body' => "Body for $key"]],
        ], $overrides)], $overrides['status'] ?? 'published');

        return Entry::where('key', $key)->firstOrFail();
    }
}
