<?php

namespace App\Services;

use App\Models\Entry;
use App\Models\EntryTranslation;
use App\Support\Locales;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

/**
 * Shapes published entries for public pages and APIs.
 *
 * Fallback rule: a locale shows its own published translation; otherwise the published
 * English source; otherwise any published translation. Fallback pages are flagged so the
 * UI can show a notice and SEO can point the canonical at the source-language URL.
 */
class EntryPresenter
{
    public const CARD_RELATIONS = [
        'translations',
        'heroMedia',
        'region.translations',
        'category',
        'vehicleSpec',
        'characterProfile',
        'weaponSpec',
        'missionDetail',
        'videos',
    ];

    public static function publicQuery(): Builder
    {
        return Entry::query()->published()->with([
            'translations' => fn ($q) => $q->where('status', 'published'),
            'heroMedia',
            'region.translations' => fn ($q) => $q->where('status', 'published'),
            'category',
            'vehicleSpec',
            'characterProfile',
            'weaponSpec',
            'missionDetail',
            'videos',
        ]);
    }

    /** @return array{0: ?EntryTranslation, 1: bool} translation and whether it is a fallback */
    public static function resolve(Entry $entry, string $locale): array
    {
        $published = $entry->translations->where('status', 'published');
        $own = $published->firstWhere('locale', $locale);
        if ($own) {
            return [$own, false];
        }
        $source = $published->firstWhere('locale', config('atlas.default_locale')) ?? $published->first();

        return [$source, $source !== null];
    }

    public static function url(Entry $entry, string $locale): ?string
    {
        [$t] = self::resolve($entry, $locale);
        if (! $t) {
            return null;
        }

        return Locales::url($locale, config("atlas.types.{$entry->type}.section"), $t->slug);
    }

    public static function card(Entry $entry, string $locale): ?array
    {
        [$t, $fallback] = self::resolve($entry, $locale);
        if (! $t) {
            return null;
        }
        $section = config("atlas.types.{$entry->type}.section");

        return [
            'id' => $entry->id,
            'key' => $entry->key,
            'type' => $entry->type,
            'section' => $section,
            'title' => $t->title,
            'slug' => $t->slug,
            'url' => Locales::url($locale, $section, $t->slug),
            'summary' => $t->summary,
            'locale' => $t->locale,
            'fallback' => $fallback,
            'verification' => $entry->verification,
            'confidence' => $entry->confidence,
            'spoiler_level' => $entry->spoiler_level,
            'featured' => $entry->featured,
            'art' => $entry->art_preset,
            'hero' => $entry->heroMedia?->present($locale),
            // Official trailer still served by YouTube, used when no artwork is attached.
            'still' => ($v = $entry->videos->first()) && $v->embed_provider === 'youtube' ? 'https://i.ytimg.com/vi/'.rawurlencode($v->embed_id).'/maxresdefault.jpg' : null,
            'event_date' => $entry->event_date?->toDateString(),
            'category' => $entry->category ? ['key' => $entry->category->key, 'name' => $entry->category->name($locale)] : null,
            'region' => $entry->region ? self::miniLink($entry->region, $locale) : null,
            'meta' => self::cardMeta($entry),
            'trackable' => (bool) config("atlas.types.{$entry->type}.trackable"),
        ];
    }

    private static function cardMeta(Entry $entry): array
    {
        return array_filter([
            'vehicle_class' => $entry->vehicleSpec?->vehicle_class,
            'manufacturer' => $entry->vehicleSpec?->manufacturer,
            'body_style' => $entry->vehicleSpec?->body_style,
            'character_role' => $entry->characterProfile?->role,
            'weapon_class' => $entry->weaponSpec?->weapon_class,
            'mission_type' => $entry->missionDetail?->mission_type,
            'kind' => $entry->attributes['kind'] ?? null,
        ], fn ($v) => $v !== null);
    }

    public static function miniLink(Entry $entry, string $locale): ?array
    {
        [$t] = self::resolve($entry, $locale);
        if (! $t || $entry->status !== 'published') {
            return null;
        }

        return [
            'id' => $entry->id,
            'type' => $entry->type,
            'title' => $t->title,
            'url' => Locales::url($locale, config("atlas.types.{$entry->type}.section"), $t->slug),
        ];
    }

    /** @param iterable<Entry> $entries */
    public static function cards(iterable $entries, string $locale): array
    {
        return collect($entries)->map(fn (Entry $e) => self::card($e, $locale))->filter()->values()->all();
    }

    public static function full(Entry $entry, string $locale): array
    {
        $entry->loadMissing([
            'sources',
            'tags',
            'media',
            'verificationEvents',
            'markers' => fn ($q) => $q->where('status', 'published'),
            'outgoingRelations.to' => fn ($q) => $q->published()->with(self::CARD_RELATIONS),
            'incomingRelations.from' => fn ($q) => $q->published()->with(self::CARD_RELATIONS),
        ]);

        [$t, $fallback] = self::resolve($entry, $locale);
        $card = self::card($entry, $locale);

        $alternates = [];
        foreach ($entry->translations->where('status', 'published') as $tr) {
            $alternates[$tr->locale] = Locales::url($tr->locale, $card['section'], $tr->slug);
        }
        $switcher = [];
        foreach (Locales::codes() as $code) {
            $switcher[$code] = self::url($entry, $code);
        }

        return array_merge($card, [
            'body' => $t->body,
            'fields' => $t->fields ?? [],
            'aliases' => $t->aliases ?? [],
            'is_machine' => $t->is_machine,
            'translation_reviewed' => $t->reviewed_at !== null,
            'updated_at' => $entry->updated_at?->toIso8601String(),
            'last_verified_at' => $entry->last_verified_at?->toDateString(),
            'published_at' => $entry->published_at?->toIso8601String(),
            'attributes' => self::publicAttributes($entry),
            'specs' => self::specs($entry),
            'tags' => $entry->tags->map(fn ($tag) => ['key' => $tag->key, 'name' => $tag->name($locale)])->values(),
            'sources' => $entry->sources->map(fn ($s) => [
                'title' => $s->title,
                'url' => $s->url,
                'publisher' => $s->publisher,
                'type' => $s->source_type,
                'published_on' => $s->published_on?->toDateString(),
                'accessed_on' => $s->accessed_on?->toDateString(),
                'note' => $s->pivot->evidence_note,
                'supports' => $s->pivot->supports,
            ])->values(),
            'verification_history' => $entry->verificationEvents->map(fn ($v) => [
                'from' => $v->from_status,
                'to' => $v->to_status,
                'note' => $v->note,
                'date' => $v->created_at?->toDateString(),
            ])->values(),
            'gallery' => $entry->media->map(fn ($m) => array_merge($m->present($locale), ['role' => $m->pivot->role]))->values(),
            'markers' => $entry->markers->map(fn ($m) => [
                'id' => $m->id,
                'x' => $m->x,
                'y' => $m->y,
                'precision' => $m->precision,
                'category' => $m->category,
            ])->values(),
            'related' => self::related($entry, $locale),
            'alternates' => $alternates,
            'switcher' => $switcher,
        ]);
    }

    private static function publicAttributes(Entry $entry): array
    {
        return collect($entry->attributes ?? [])->except(['internal'])->all();
    }

    private static function specs(Entry $entry): ?array
    {
        return match ($entry->type) {
            'vehicle' => $entry->vehicleSpec?->only(['manufacturer', 'model', 'vehicle_class', 'body_style', 'real_world_inspiration', 'inspiration_verification', 'top_speed', 'acceleration', 'braking', 'handling', 'durability', 'seats', 'drivetrain', 'stats_verification', 'first_seen']),
            'character' => $entry->characterProfile?->only(['full_name', 'role', 'affiliation', 'voice_actor', 'voice_actor_verification', 'first_seen']),
            'weapon' => $entry->weaponSpec?->only(['weapon_class', 'damage', 'fire_rate', 'range', 'accuracy', 'magazine', 'stats_verification', 'first_seen']),
            'mission' => $entry->missionDetail?->only(['mission_type', 'sequence', 'missable', 'reward_cash']),
            default => null,
        };
    }

    /** Related entries grouped by section, merged from both relation directions. */
    public static function related(Entry $entry, string $locale): array
    {
        $items = collect();
        foreach ($entry->outgoingRelations as $rel) {
            if ($rel->to) {
                $items->push([$rel->to, $rel->relation_type, $rel->note]);
            }
        }
        foreach ($entry->incomingRelations as $rel) {
            if ($rel->from) {
                $items->push([$rel->from, $rel->relation_type, $rel->note]);
            }
        }

        return $items
            ->unique(fn ($i) => $i[0]->id)
            ->map(function ($i) use ($locale) {
                $card = self::card($i[0], $locale);

                return $card ? array_merge($card, ['relation' => $i[1], 'relation_note' => $i[2]]) : null;
            })
            ->filter()
            ->groupBy('section')
            ->map(fn (Collection $g) => $g->values())
            ->all();
    }
}
