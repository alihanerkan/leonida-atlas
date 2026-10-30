<?php

namespace App\Console\Commands;

use App\Models\Entry;
use App\Services\MediaStore;
use App\Support\Settings;
use Illuminate\Console\Command;

/**
 * Imports official artwork that the site owner has downloaded and chosen to publish.
 * Name files after entry keys (lucia-caminos.jpg) or homepage slots (hero-1.jpg … hero-6.jpg).
 */
class ImportOfficialArtwork extends Command
{
    protected $signature = 'atlas:import-official {dir : Folder containing the images}
        {--attribution=© Rockstar Games : Credit line shown with every image}
        {--source=https://www.rockstargames.com/VI/media/artwork-wallpapers : Where the artwork was published}';

    protected $description = 'Attach official artwork from a local folder to entries and homepage slots';

    public function handle(MediaStore $store): int
    {
        $dir = rtrim($this->argument('dir'), '/');
        $files = glob("$dir/*.{jpg,jpeg,png,webp,JPG,JPEG,PNG,WEBP}", GLOB_BRACE) ?: [];
        if (! $files) {
            $this->error("No images found in $dir");

            return self::FAILURE;
        }
        $slots = Settings::get('home_media', []) ?: [];
        foreach ($files as $file) {
            $key = strtolower(pathinfo($file, PATHINFO_FILENAME));
            if (! @getimagesize($file)) {
                $this->warn("Not an image: $file");

                continue;
            }
            $entry = Entry::where('key', $key)->first();
            $isSlot = str_starts_with($key, 'hero-');
            if (! $entry && ! $isSlot) {
                $this->warn("No entry or slot named '$key' — skipped. Use an entry key such as lucia-caminos, or hero-1 … hero-6.");

                continue;
            }
            $media = $store->storeBytes(file_get_contents($file), strtolower(pathinfo($file, PATHINFO_EXTENSION)), [
                'title' => $entry?->label('en') ?? $key,
                'attribution' => $this->option('attribution'),
                'source_url' => $this->option('source'),
                'usage_status' => 'official_artwork',
                'alt' => ['en' => $entry ? $entry->label('en').' — official artwork' : 'Official Grand Theft Auto VI artwork'],
                'tags' => ['official-artwork'],
            ]);
            if ($entry) {
                $entry->update(['hero_media_id' => $media->id]);
            } else {
                $slots['official-'.substr($key, 5)] = $media->id;
            }
            $this->line("✓ $key → media #{$media->id}");
        }
        Settings::put(['home_media' => $slots]);
        $this->info('Done.');

        return self::SUCCESS;
    }
}
