<?php

namespace App\Console\Commands;

use App\Models\Entry;
use App\Services\MediaStore;
use Illuminate\Console\Command;

/** Attach an image you have the right to use (e.g. an official press image) to an entry as its hero. */
class AttachImage extends Command
{
    protected $signature = 'atlas:attach-image {entry : Entry key, e.g. lucia-caminos} {path : Local image file}
        {--attribution= : Credit line, e.g. "© Rockstar Games"} {--source= : Where the image was published}
        {--usage=licensed : original|licensed|official_embed|permission_pending|placeholder} {--alt= : English alt text}';

    protected $description = 'Attach a local image to an entry as its hero image, with attribution';

    public function handle(MediaStore $store): int
    {
        $entry = Entry::where('key', $this->argument('entry'))->first();
        $path = $this->argument('path');
        if (! $entry || ! is_file($path) || ! @getimagesize($path)) {
            $this->error('Unknown entry key or unreadable image.');

            return self::FAILURE;
        }
        if (! $this->option('attribution')) {
            $this->error('--attribution is required.');

            return self::FAILURE;
        }
        $ext = strtolower(pathinfo($path, PATHINFO_EXTENSION)) ?: 'jpg';
        $media = $store->storeBytes(file_get_contents($path), $ext, [
            'title' => $entry->label('en'),
            'attribution' => $this->option('attribution'),
            'source_url' => $this->option('source'),
            'usage_status' => $this->option('usage'),
            'alt' => ['en' => $this->option('alt') ?: $entry->label('en')],
        ]);
        $entry->update(['hero_media_id' => $media->id]);
        $this->info("Attached media #{$media->id} to {$entry->key}.");

        return self::SUCCESS;
    }
}
