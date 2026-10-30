<?php

namespace Database\Seeders;

use App\Models\Entry;
use App\Models\Media;
use Illuminate\Database\Seeder;

/**
 * Registers the official Rockstar screenshots and Trailer 2 frames stored in public/media/screens
 * and links the ones whose subject is certain to their entries (hero image + gallery).
 */
class ScreensSeeder extends Seeder
{
    public const SOURCES = [
        'screenshot' => 'https://www.rockstargames.com/VI',
        'trailer-2' => 'https://www.youtube.com/watch?v=VQRLujxTm3c',
    ];

    public function run(): void
    {
        $items = json_decode(file_get_contents(database_path('seeders/data/screens.json')), true);

        foreach ($items as $item) {
            $path = "screens/{$item['file']}-1920.webp";
            $hero = collect($item['links'])->firstWhere('role', 'hero');
            $media = Media::updateOrCreate(['disk' => 'screens', 'path' => $path], [
                'kind' => 'image',
                'thumb_path' => "screens/{$item['file']}-960.webp",
                'mime' => 'image/webp',
                'width' => $item['width'],
                'height' => $item['height'],
                'focal_x' => $hero['focal'] ?? null,
                'title' => $item['origin'] === 'trailer-2' ? 'Grand Theft Auto VI — Trailer 2' : 'Grand Theft Auto VI — official screenshot',
                'attribution' => '© Rockstar Games',
                'source_url' => self::SOURCES[$item['origin']],
                'usage_status' => 'official_artwork',
                'alt' => ['en' => $item['origin'] === 'trailer-2' ? 'Frame from Grand Theft Auto VI Trailer 2' : 'Official Grand Theft Auto VI screenshot'],
                'tags' => ['official', $item['origin']],
            ]);

            foreach ($item['links'] as $link) {
                $entry = Entry::where('key', $link['key'])->first();
                if (! $entry) {
                    continue;
                }
                if ($link['role'] === 'hero') {
                    $entry->update(['hero_media_id' => $media->id]);
                }
                $entry->media()->syncWithoutDetaching([$media->id => ['role' => $link['role'] === 'hero' ? 'hero' : 'gallery']]);
            }
        }
    }
}
