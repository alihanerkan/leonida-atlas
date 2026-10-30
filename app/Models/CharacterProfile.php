<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CharacterProfile extends Model
{
    protected $table = 'character_profiles';

    protected $guarded = ['id'];

    public function entry(): BelongsTo
    {
        return $this->belongsTo(Entry::class);
    }
}
