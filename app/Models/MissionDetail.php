<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MissionDetail extends Model
{
    protected $table = 'mission_details';

    protected $guarded = ['id'];

    public function entry(): BelongsTo
    {
        return $this->belongsTo(Entry::class);
    }
}
