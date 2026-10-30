<?php

namespace App\Models;

use App\Support\SearchText;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EntryTranslation extends Model
{
    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'fields' => 'array',
            'aliases' => 'array',
            'is_machine' => 'boolean',
            'reviewed_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (EntryTranslation $t) {
            $t->search_text = SearchText::build([$t->title, $t->aliases ?? [], $t->summary, $t->body, $t->fields ?? []]);
        });
    }

    public function entry(): BelongsTo
    {
        return $this->belongsTo(Entry::class);
    }

    public function translator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'translator_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function isPublished(): bool
    {
        return $this->status === 'published';
    }
}
