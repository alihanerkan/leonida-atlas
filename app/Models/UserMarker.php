<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserMarker extends Model
{
    protected $fillable = ['x', 'y', 'label', 'note', 'color'];

    protected function casts(): array
    {
        return ['x' => 'float', 'y' => 'float'];
    }
}
