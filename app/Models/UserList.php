<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class UserList extends Model
{
    protected $fillable = ['name'];

    public function entries(): BelongsToMany
    {
        return $this->belongsToMany(Entry::class, 'user_list_items')->withTimestamps();
    }
}
