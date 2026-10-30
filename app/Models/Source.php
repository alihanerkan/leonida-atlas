<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Source extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['published_on' => 'date', 'accessed_on' => 'date'];
    }

    protected static function booted(): void
    {
        static::saving(fn (Source $s) => $s->url_hash = self::hashUrl($s->url));
    }

    public static function hashUrl(string $url): string
    {
        return hash('sha256', rtrim(strtolower(trim($url)), '/'));
    }

    public function entries(): BelongsToMany
    {
        return $this->belongsToMany(Entry::class)->withPivot(['evidence_note', 'supports']);
    }
}
