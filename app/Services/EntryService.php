<?php

namespace App\Services;

use App\Models\CharacterProfile;
use App\Models\Entry;
use App\Models\EntryRevision;
use App\Models\EntryTranslation;
use App\Models\MissionDetail;
use App\Models\User;
use App\Models\VehicleSpec;
use App\Models\VerificationEvent;
use App\Models\WeaponSpec;
use App\Support\Audit;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class EntryService
{
    public const SPEC_FIELDS = [
        'vehicle' => ['manufacturer', 'model', 'vehicle_class', 'body_style', 'real_world_inspiration', 'inspiration_verification', 'top_speed', 'acceleration', 'braking', 'handling', 'durability', 'seats', 'drivetrain', 'stats_verification', 'first_seen'],
        'character' => ['full_name', 'role', 'affiliation', 'voice_actor', 'voice_actor_verification', 'first_seen'],
        'weapon' => ['weapon_class', 'damage', 'fire_rate', 'range', 'accuracy', 'magazine', 'stats_verification', 'first_seen'],
        'mission' => ['mission_type', 'sequence', 'missable', 'reward_cash'],
    ];

    public function save(?Entry $entry, array $data, User $user): Entry
    {
        return DB::transaction(function () use ($entry, $data, $user) {
            $isNew = $entry === null;
            $entry ??= new Entry(['type' => $data['type'], 'created_by' => $user->id]);
            $oldVerification = $entry->verification;
            $oldStatus = $entry->status;

            $entry->fill([
                'key' => $data['key'],
                'status' => $data['status'],
                'verification' => $data['verification'],
                'confidence' => $data['confidence'],
                'spoiler_level' => $data['spoiler_level'],
                'featured' => (bool) ($data['featured'] ?? false),
                'sort_order' => (int) ($data['sort_order'] ?? 0),
                'region_id' => $data['region_id'] ?? null,
                'category_id' => $data['category_id'] ?? null,
                'hero_media_id' => $data['hero_media_id'] ?? null,
                'art_preset' => $data['art_preset'] ?? null,
                'event_date' => $data['event_date'] ?? null,
                'attributes' => $data['attributes'] ?? null,
                'research_notes' => $data['research_notes'] ?? null,
                'updated_by' => $user->id,
            ]);
            if ($entry->status === 'published' && ! $entry->published_at) {
                $entry->published_at = now();
            }
            if (($data['mark_verified'] ?? false) || $oldVerification !== $entry->verification) {
                $entry->last_verified_at = now();
                $entry->verified_by = $user->id;
            }
            $entry->save();

            if (isset($data['source'])) {
                $this->saveTranslation($entry, config('atlas.default_locale'), $data['source'], $user, $isNew ? 'published' : null);
            }

            $this->saveSpecs($entry, $data['specs'] ?? []);

            if (array_key_exists('tags', $data)) {
                $entry->tags()->sync($data['tags'] ?? []);
            }
            if (array_key_exists('gallery', $data)) {
                $sync = [];
                foreach (array_values($data['gallery'] ?? []) as $i => $mediaId) {
                    $sync[$mediaId] = ['role' => 'gallery', 'sort_order' => $i];
                }
                $keep = $entry->media()->wherePivot('role', '!=', 'gallery')->get()->mapWithKeys(fn ($m) => [$m->id => ['role' => $m->pivot->role, 'sort_order' => $m->pivot->sort_order]])->all();
                $entry->media()->sync($sync + $keep);
            }

            if ($isNew || $oldVerification !== $entry->verification) {
                VerificationEvent::create([
                    'entry_id' => $entry->id,
                    'from_status' => $isNew ? null : $oldVerification,
                    'to_status' => $entry->verification,
                    'note' => $data['verification_note'] ?? null,
                    'user_id' => $user->id,
                ]);
            }

            $this->snapshot($entry, $user, $isNew ? 'Created' : 'Updated');
            Audit::log($isNew ? 'entry.created' : 'entry.updated', $entry, array_filter([
                'status' => $oldStatus !== $entry->status ? [$oldStatus, $entry->status] : null,
                'verification' => $oldVerification !== $entry->verification ? [$oldVerification, $entry->verification] : null,
            ]));

            return $entry->fresh(['translations']);
        });
    }

    public function saveTranslation(Entry $entry, string $locale, array $t, User $user, ?string $forceStatus = null): EntryTranslation
    {
        $translation = EntryTranslation::firstOrNew(['entry_id' => $entry->id, 'locale' => $locale]);
        $slug = Str::slug($t['slug'] ?? '') ?: Str::slug($t['title']) ?: $entry->key;
        $slug = $this->uniqueSlug($entry, $locale, $slug);
        $isNew = ! $translation->exists;

        $translation->fill([
            'entry_type' => $entry->type,
            'title' => $t['title'],
            'slug' => $slug,
            'summary' => $t['summary'] ?? null,
            'body' => $t['body'] ?? null,
            'fields' => $t['fields'] ?? $translation->fields,
            'aliases' => isset($t['aliases']) ? array_values(array_filter(array_map('trim', (array) $t['aliases']))) : $translation->aliases,
            'seo_title' => $t['seo_title'] ?? null,
            'seo_description' => $t['seo_description'] ?? null,
            'status' => $forceStatus ?? ($t['status'] ?? $translation->status ?? 'draft'),
            'is_machine' => (bool) ($t['is_machine'] ?? $translation->is_machine ?? false),
            'translator_id' => $user->id,
        ]);
        if (($t['mark_reviewed'] ?? false) === true) {
            $translation->reviewed_by = $user->id;
            $translation->reviewed_at = now();
            $translation->is_machine = false;
        }
        $translation->save();
        $entry->touch();

        if ($locale !== config('atlas.default_locale')) {
            $this->snapshot($entry, $user, "Translation $locale ".($isNew ? 'created' : 'updated'), $locale);
            Audit::log('translation.'.($isNew ? 'created' : 'updated'), $entry, ['locale' => $locale, 'status' => $translation->status]);
        }

        return $translation;
    }

    private function uniqueSlug(Entry $entry, string $locale, string $slug): string
    {
        $base = $slug;
        $i = 2;
        while (EntryTranslation::where('entry_type', $entry->type)->where('locale', $locale)->where('slug', $slug)->where('entry_id', '!=', $entry->id)->exists()) {
            $slug = $base.'-'.$i++;
        }

        return $slug;
    }

    private function saveSpecs(Entry $entry, array $specs): void
    {
        $fields = self::SPEC_FIELDS[$entry->type] ?? null;
        if (! $fields) {
            return;
        }
        $values = collect($specs)->only($fields)->map(fn ($v) => $v === '' ? null : $v)->all();
        $model = match ($entry->type) {
            'vehicle' => VehicleSpec::class,
            'character' => CharacterProfile::class,
            'weapon' => WeaponSpec::class,
            'mission' => MissionDetail::class,
        };
        if ($entry->type === 'vehicle' && empty($values['vehicle_class'])) {
            $values['vehicle_class'] = 'car';
        }
        if ($entry->type === 'weapon' && empty($values['weapon_class'])) {
            $values['weapon_class'] = 'unknown';
        }
        if ($entry->type === 'mission') {
            $values['missable'] = (bool) ($values['missable'] ?? false);
            $values['mission_type'] ??= 'main';
        }
        $model::updateOrCreate(['entry_id' => $entry->id], $values);
    }

    public function snapshot(Entry $entry, User $user, string $summary, ?string $locale = null): void
    {
        $entry->load(['translations', 'vehicleSpec', 'characterProfile', 'weaponSpec', 'missionDetail']);
        EntryRevision::create([
            'entry_id' => $entry->id,
            'locale' => $locale,
            'user_id' => $user->id,
            'summary' => $summary,
            'snapshot' => [
                'entry' => $entry->only(['key', 'status', 'verification', 'confidence', 'spoiler_level', 'featured', 'region_id', 'attributes', 'event_date']),
                'translations' => $entry->translations->map->only(['locale', 'title', 'slug', 'summary', 'body', 'status'])->values(),
                'specs' => ($entry->vehicleSpec ?? $entry->characterProfile ?? $entry->weaponSpec ?? $entry->missionDetail)?->toArray(),
            ],
        ]);
    }

    /** Lightweight duplicate detection by similar titles within the same type. */
    public function findDuplicates(string $type, string $title, ?int $ignoreId = null): array
    {
        $needle = mb_strtolower(trim($title));
        if (mb_strlen($needle) < 3) {
            return [];
        }

        return EntryTranslation::query()
            ->where('entry_type', $type)
            ->when($ignoreId, fn ($q) => $q->where('entry_id', '!=', $ignoreId))
            ->whereHas('entry')
            ->get(['entry_id', 'title', 'locale'])
            ->filter(function ($t) use ($needle) {
                $hay = mb_strtolower($t->title);
                similar_text($needle, $hay, $pct);

                return $pct >= 72 || str_contains($hay, $needle) || str_contains($needle, $hay);
            })
            ->unique('entry_id')
            ->take(5)
            ->map(fn ($t) => ['id' => $t->entry_id, 'title' => $t->title, 'locale' => $t->locale])
            ->values()
            ->all();
    }
}
