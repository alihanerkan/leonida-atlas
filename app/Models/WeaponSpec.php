<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WeaponSpec extends Model
{
    protected $table = 'weapon_specs';

    protected $guarded = ['id'];

    public function entry(): BelongsTo
    {
        return $this->belongsTo(Entry::class);
    }
}
