<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EntryRelation extends Model
{
    protected $guarded = ['id'];

    public function from(): BelongsTo
    {
        return $this->belongsTo(Entry::class, 'from_entry_id');
    }

    public function to(): BelongsTo
    {
        return $this->belongsTo(Entry::class, 'to_entry_id');
    }
}
