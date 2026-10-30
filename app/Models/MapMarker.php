<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MapMarker extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['x' => 'float', 'y' => 'float', 'zoom' => 'integer'];
    }

    public function entry(): BelongsTo
    {
        return $this->belongsTo(Entry::class);
    }
}
