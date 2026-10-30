<?php

namespace Database\Seeders;

use App\Models\User;
use App\Services\ContentImporter;
use Illuminate\Database\Seeder;

/** Imports the researched demo dataset from database/seeders/data. */
class AtlasContentSeeder extends Seeder
{
    public function run(): void
    {
        $dir = __DIR__.'/data';
        $read = fn (string $f) => json_decode(file_get_contents("$dir/$f"), true, flags: JSON_THROW_ON_ERROR);

        $importer = new ContentImporter(User::where('role', 'super_admin')->value('id'));
        $graph = $read('graph.json');

        $importer->importSources($read('sources.json'));
        $importer->importTags($graph['tags']);
        foreach (['places.json', 'characters.json', 'encyclopedia.json', 'media.json'] as $file) {
            $importer->importEntries($read($file));
        }
        $importer->importRelations($graph['relations']);
        $importer->importMarkers($graph['markers']);

        $this->command?->info('Atlas content imported: '.json_encode($importer->stats));
    }
}
