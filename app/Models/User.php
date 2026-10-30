<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    // role, translator_locales and is_active are deliberately not mass assignable.
    protected $fillable = [
        'name',
        'email',
        'password',
        'locale',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'translator_locales' => 'array',
            'is_active' => 'boolean',
        ];
    }

    public function hasPermission(string $permission): bool
    {
        if (! $this->is_active) {
            return false;
        }

        return in_array($this->role, config('atlas.permissions')[$permission] ?? [], true);
    }

    /** @return list<string> */
    public function permissions(): array
    {
        return array_keys(array_filter(
            config('atlas.permissions'),
            fn (array $roles) => $this->is_active && in_array($this->role, $roles, true),
        ));
    }

    public function canTranslate(string $locale): bool
    {
        if (! $this->hasPermission('translations.edit')) {
            return false;
        }
        if ($this->role !== 'translator') {
            return true;
        }

        return in_array($locale, $this->translator_locales ?? [], true);
    }

    public function favorites(): BelongsToMany
    {
        return $this->belongsToMany(Entry::class, 'user_favorites')->withTimestamps();
    }

    public function progress(): BelongsToMany
    {
        return $this->belongsToMany(Entry::class, 'user_progress')->withPivot('state')->withTimestamps();
    }

    public function markers(): HasMany
    {
        return $this->hasMany(UserMarker::class);
    }

    public function lists(): HasMany
    {
        return $this->hasMany(UserList::class);
    }

    public function submissions(): HasMany
    {
        return $this->hasMany(Submission::class);
    }
}
