<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Category extends Model
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
}
