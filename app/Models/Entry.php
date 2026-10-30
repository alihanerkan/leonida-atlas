<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Entry extends Model
{
    use SoftDeletes;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'attributes' => 'array',
            'featured' => 'boolean',
            'event_date' => 'date',
            'published_at' => 'datetime',
            'last_verified_at' => 'datetime',
        ];
    }

    public function translations(): HasMany
    {
        return $this->hasMany(EntryTranslation::class);
    }

    public function translation(string $locale): ?EntryTranslation
    {
        return $this->translations->firstWhere('locale', $locale);
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function region(): BelongsTo
    {
        return $this->belongsTo(Entry::class, 'region_id');
    }

    public function heroMedia(): BelongsTo
    {
        return $this->belongsTo(Media::class, 'hero_media_id');
    }

    public function media(): BelongsToMany
    {
        return $this->belongsToMany(Media::class, 'entry_media')->withPivot(['role', 'sort_order'])->orderBy('entry_media.sort_order');
    }

    public function videos(): BelongsToMany
    {
        return $this->belongsToMany(Media::class, 'entry_media')->wherePivot('role', 'video');
    }

    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class);
    }

    public function sources(): BelongsToMany
    {
        return $this->belongsToMany(Source::class)->withPivot(['evidence_note', 'supports'])->withTimestamps();
    }

    public function outgoingRelations(): HasMany
    {
        return $this->hasMany(EntryRelation::class, 'from_entry_id');
    }

    public function incomingRelations(): HasMany
    {
        return $this->hasMany(EntryRelation::class, 'to_entry_id');
    }

    public function verificationEvents(): HasMany
    {
        return $this->hasMany(VerificationEvent::class)->latest();
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(EntryRevision::class)->latest();
    }

    public function markers(): HasMany
    {
        return $this->hasMany(MapMarker::class);
    }

    public function characterProfile(): HasOne
    {
        return $this->hasOne(CharacterProfile::class);
    }

    public function vehicleSpec(): HasOne
    {
        return $this->hasOne(VehicleSpec::class);
    }

    public function weaponSpec(): HasOne
    {
        return $this->hasOne(WeaponSpec::class);
    }

    public function missionDetail(): HasOne
    {
        return $this->hasOne(MissionDetail::class);
    }

    public function verifier(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function editor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function scopePublished(Builder $q): Builder
    {
        return $q->where('status', 'published')->where(fn ($w) => $w->whereNull('published_at')->orWhere('published_at', '<=', now()));
    }

    public function scopeOfTypes(Builder $q, array $types): Builder
    {
        return $q->whereIn('type', $types);
    }

    public function label(?string $locale = null): string
    {
        $locale ??= app()->getLocale();

        return $this->translation($locale)?->title
            ?? $this->translation(config('atlas.default_locale'))?->title
            ?? $this->translations->first()?->title
            ?? $this->key;
    }
}
