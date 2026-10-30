<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;

class Media extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['alt' => 'array', 'caption' => 'array', 'tags' => 'array'];
    }

    public function entries(): BelongsToMany
    {
        return $this->belongsToMany(Entry::class, 'entry_media')->withPivot('role');
    }

    public function url(): ?string
    {
        return $this->path ? Storage::disk($this->disk)->url($this->path) : null;
    }

    public function thumbUrl(): ?string
    {
        return $this->thumb_path ? Storage::disk($this->disk)->url($this->thumb_path) : $this->url();
    }

    public function usageCount(): int
    {
        return $this->entries()->count() + Entry::where('hero_media_id', $this->id)->count();
    }

    public function present(?string $locale = null): array
    {
        $locale ??= app()->getLocale();

        return [
            'id' => $this->id,
            'kind' => $this->kind,
            'url' => $this->url(),
            'thumb' => $this->thumbUrl(),
            'width' => $this->width,
            'height' => $this->height,
            'focal_x' => $this->focal_x,
            'embed_provider' => $this->embed_provider,
            'embed_id' => $this->embed_id,
            'art_preset' => $this->art_preset,
            'title' => $this->title,
            'alt' => $this->alt[$locale] ?? $this->alt['en'] ?? $this->title,
            'caption' => $this->caption[$locale] ?? $this->caption['en'] ?? null,
            'attribution' => $this->attribution,
            'source_url' => $this->source_url,
            'usage_status' => $this->usage_status,
            'license' => $this->license,
        ];
    }
}
