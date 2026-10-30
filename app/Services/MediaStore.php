<?php

namespace App\Services;

use App\Models\Media;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

/** Stores image bytes on the configured disk with a WebP thumbnail and SHA-256 duplicate detection. */
class MediaStore
{
    public function storeBytes(string $bytes, string $extension, array $attributes): Media
    {
        $hash = hash('sha256', $bytes);
        if ($existing = Media::where('hash', $hash)->first()) {
            $existing->update(array_intersect_key($attributes, array_flip(['title', 'attribution', 'source_url', 'license', 'usage_status', 'alt', 'caption'])));

            return $existing;
        }

        $disk = config('atlas.media.disk');
        $dir = 'media/'.now()->format('Y/m');
        $name = Str::uuid()->toString();
        $path = "$dir/$name.$extension";
        Storage::disk($disk)->put($path, $bytes);
        $size = @getimagesizefromstring($bytes) ?: [null, null, 'mime' => null];

        return Media::create(array_merge([
            'kind' => 'image',
            'disk' => $disk,
            'path' => $path,
            'thumb_path' => $this->thumbnail($bytes, $disk, "$dir/{$name}_thumb.webp"),
            'mime' => $size['mime'] ?? null,
            'size' => strlen($bytes),
            'width' => $size[0],
            'height' => $size[1],
            'hash' => $hash,
        ], $attributes));
    }

    public function thumbnail(string $bytes, string $disk, string $target, ?int $width = null): ?string
    {
        if (! function_exists('imagecreatefromstring')) {
            return null;
        }
        $img = @imagecreatefromstring($bytes);
        if (! $img) {
            return null;
        }
        $w = imagesx($img);
        $h = imagesy($img);
        $tw = min($width ?? config('atlas.media.thumb_width'), $w);
        $th = (int) round($h * ($tw / $w));
        $thumb = imagecreatetruecolor($tw, $th);
        imagealphablending($thumb, false);
        imagesavealpha($thumb, true);
        imagecopyresampled($thumb, $img, 0, 0, 0, 0, $tw, $th, $w, $h);
        ob_start();
        imagewebp($thumb, null, 80);
        $data = ob_get_clean();
        imagedestroy($img);
        imagedestroy($thumb);
        Storage::disk($disk)->put($target, $data);

        return $target;
    }
}
