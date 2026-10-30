<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VehicleSpec extends Model
{
    protected $table = 'vehicle_specs';

    protected $guarded = ['id'];

    public function entry(): BelongsTo
    {
        return $this->belongsTo(Entry::class);
    }
}
