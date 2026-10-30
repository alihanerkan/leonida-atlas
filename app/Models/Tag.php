<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Tag extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['names' => 'array'];
    }

    public function name(?string $locale = null): string
    {
        $names = $this->names ?? [];

        return $names[$locale ?? app()->getLocale()] ?? $names['en'] ?? $this->key;
    }

    public function entries(): BelongsToMany
    {
        return $this->belongsToMany(Entry::class);
    }
}
