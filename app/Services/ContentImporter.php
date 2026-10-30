<?php

namespace App\Services;

use App\Models\Category;
use App\Models\CharacterProfile;
use App\Models\Entry;
use App\Models\EntryRelation;
use App\Models\EntryTranslation;
use App\Models\MapMarker;
use App\Models\Media;
use App\Models\MissionDetail;
use App\Models\Source;
use App\Models\Tag;
use App\Models\VehicleSpec;
use App\Models\VerificationEvent;
use App\Models\WeaponSpec;
use App\Support\Locales;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Imports structured research records. Idempotent: entries, sources and tags are matched
 * by their stable keys, so re-running an import updates records instead of duplicating them.
 */
class ContentImporter
{
    private const CATEGORY_NAMES = [
        'activity' => ['en' => 'Activity', 'tr' => 'Etkinlik', 'es' => 'Actividad', 'zh-CN' => '活动', 'it' => 'Attività', 'fr' => 'Activité', 'ru' => 'Занятие'],
        'mechanic' => ['en' => 'Game mechanic', 'tr' => 'Oyun mekaniği', 'es' => 'Mecánica', 'zh-CN' => '游戏机制', 'it' => 'Meccanica', 'fr' => 'Mécanique', 'ru' => 'Механика'],
        'media' => ['en' => 'Radio & media', 'tr' => 'Radyo ve medya', 'es' => 'Radio y medios', 'zh-CN' => '电台与媒体', 'it' => 'Radio e media', 'fr' => 'Radio et médias', 'ru' => 'Радио и медиа'],
        'landmark' => ['en' => 'Landmark', 'tr' => 'Simge yapı', 'es' => 'Lugar emblemático', 'zh-CN' => '地标', 'it' => 'Luogo simbolo', 'fr' => 'Lieu emblématique', 'ru' => 'Достопримечательность'],
        'district' => ['en' => 'District', 'tr' => 'Semt', 'es' => 'Distrito', 'zh-CN' => '街区', 'it' => 'Quartiere', 'fr' => 'Quartier', 'ru' => 'Район'],
        'business' => ['en' => 'Business', 'tr' => 'İşletme', 'es' => 'Negocio', 'zh-CN' => '商业场所', 'it' => 'Attività commerciale', 'fr' => 'Commerce', 'ru' => 'Бизнес'],
    ];

    /** @var array<string, int> */
    private array $sourceIds = [];

    public array $stats = ['entries' => 0, 'translations' => 0, 'sources' => 0, 'relations' => 0, 'markers' => 0];

    public function __construct(private ?int $userId = null, private bool $machineForNonSource = true) {}

    public function importSources(array $sources): void
    {
        foreach ($sources as $key => $s) {
            $source = Source::firstOrNew(['url_hash' => Source::hashUrl($s['url'])]);
            $source->fill([
                'title' => $s['title'],
                'url' => $s['url'],
                'publisher' => $s['publisher'] ?? null,
                'source_type' => $s['type'] ?? 'press',
                'published_on' => $s['published'] ?? null,
                'accessed_on' => $s['accessed'] ?? null,
            ])->save();
            $this->sourceIds[$key] = $source->id;
            $this->stats['sources']++;
        }
    }

    public function importTags(array $tags): void
    {
        foreach ($tags as $key => $names) {
            Tag::updateOrCreate(['key' => $key], ['names' => $names]);
        }
    }

    public static function validateEntry(array $data): array
    {
        $v = Validator::make($data, [
            'key' => ['required', 'string', 'max:128', 'regex:/^[a-z0-9-]+$/'],
            'type' => ['required', Rule::in(array_keys(config('atlas.types')))],
            'verification' => ['nullable', Rule::in(config('atlas.verification'))],
            'confidence' => ['nullable', Rule::in(config('atlas.confidence'))],
            'spoiler' => ['nullable', Rule::in(config('atlas.spoiler_levels'))],
            'status' => ['nullable', Rule::in(config('atlas.statuses'))],
            't' => ['required', 'array', 'min:1'],
            't.*.title' => ['required', 'string', 'max:255'],
            't.*.slug' => ['nullable', 'string', 'max:191'],
            't.*.summary' => ['nullable', 'string', 'max:2000'],
            'event_date' => ['nullable', 'date'],
        ]);
        $v->after(function ($validator) use ($data) {
            foreach (array_keys($data['t'] ?? []) as $locale) {
                if (! Locales::isValid($locale)) {
                    $validator->errors()->add('t', "Unsupported locale: $locale");
                }
            }
        });
        if ($v->fails()) {
            throw ValidationException::withMessages($v->errors()->toArray());
        }

        return $data;
    }

    public function importEntries(array $entries, string $status = 'published'): void
    {
        // Two passes so region references can point at entries defined later in the same file.
        $regionRefs = [];
        foreach ($entries as $data) {
            self::validateEntry($data);
            DB::transaction(function () use ($data, $status, &$regionRefs) {
                $entry = $this->upsertEntry($data, $status);
                if (! empty($data['region'])) {
                    $regionRefs[$entry->id] = $data['region'];
                }
            });
        }
        foreach ($regionRefs as $entryId => $regionKey) {
            $regionId = Entry::where('key', $regionKey)->value('id');
            if ($regionId) {
                Entry::whereKey($entryId)->update(['region_id' => $regionId]);
            }
        }
    }

    private function upsertEntry(array $data, string $status): Entry
    {
        $isNew = ! Entry::withTrashed()->where('key', $data['key'])->exists();
        $entry = Entry::withTrashed()->firstOrNew(['key' => $data['key']]);
        $kind = $data['attributes']['kind'] ?? null;

        $entry->fill([
            'type' => $data['type'],
            'status' => $data['status'] ?? $status,
            'verification' => $data['verification'] ?? 'unverified',
            'confidence' => $data['confidence'] ?? 'medium',
            'spoiler_level' => $data['spoiler'] ?? 'none',
            'featured' => (bool) ($data['featured'] ?? false),
            'sort_order' => (int) ($data['sort'] ?? 0),
            'art_preset' => $data['art'] ?? null,
            'event_date' => $data['event_date'] ?? null,
            'attributes' => $data['attributes'] ?? null,
            'research_notes' => $data['notes'] ?? 'Seeded research record drafted from the cited sources with AI assistance; pending human editorial review.',
            'category_id' => $kind && isset(self::CATEGORY_NAMES[$kind]) ? $this->category($data['type'], $kind)->id : null,
            'last_verified_at' => now(),
            'updated_by' => $this->userId,
        ]);
        if ($isNew) {
            $entry->created_by = $this->userId;
        }
        if ($entry->status === 'published' && ! $entry->published_at) {
            $entry->published_at = now();
        }
        $entry->deleted_at = null;
        $entry->save();
        $this->stats['entries']++;

        foreach ($data['t'] as $locale => $t) {
            $this->upsertTranslation($entry, $locale, $t);
        }

        $this->upsertSpecs($entry, $data);

        if (! empty($data['sources'])) {
            $sync = [];
            foreach ($data['sources'] as $key => $note) {
                if (isset($this->sourceIds[$key])) {
                    $sync[$this->sourceIds[$key]] = ['evidence_note' => $note, 'supports' => 'primary'];
                }
            }
            $entry->sources()->sync($sync);
        }

        if (! empty($data['tags'])) {
            $entry->tags()->sync(Tag::whereIn('key', $data['tags'])->pluck('id'));
        }

        if (! empty($data['video'])) {
            $media = Media::firstOrCreate(
                ['embed_provider' => $data['video']['provider'], 'embed_id' => $data['video']['id']],
                [
                    'kind' => 'embed',
                    'title' => $data['video']['title'] ?? null,
                    'source_url' => 'https://www.youtube.com/watch?v='.$data['video']['id'],
                    'attribution' => 'Rockstar Games',
                    'usage_status' => 'official_embed',
                    'license' => 'Embedded via YouTube player; not re-hosted.',
                    'uploaded_by' => $this->userId,
                ],
            );
            $entry->media()->syncWithoutDetaching([$media->id => ['role' => 'video', 'sort_order' => 0]]);
        }

        if ($isNew) {
            VerificationEvent::create([
                'entry_id' => $entry->id,
                'from_status' => null,
                'to_status' => $entry->verification,
                'note' => 'Initial classification during research import.',
                'user_id' => $this->userId,
            ]);
        }

        return $entry;
    }

    private function upsertTranslation(Entry $entry, string $locale, array $t): void
    {
        $slug = Str::slug($t['slug'] ?? $t['title']) ?: Str::slug($entry->key);
        $slug = $this->uniqueSlug($entry, $locale, $slug);
        $isSource = $locale === config('atlas.default_locale');

        EntryTranslation::updateOrCreate(
            ['entry_id' => $entry->id, 'locale' => $locale],
            [
                'entry_type' => $entry->type,
                'title' => $t['title'],
                'slug' => $slug,
                'summary' => $t['summary'] ?? null,
                'body' => $t['body'] ?? null,
                'fields' => $t['fields'] ?? null,
                'aliases' => $t['aliases'] ?? null,
                'seo_title' => $t['seo_title'] ?? null,
                'seo_description' => isset($t['summary']) ? Str::limit($t['summary'], 300, '…') : null,
                'status' => $t['status'] ?? 'published',
                'is_machine' => $t['is_machine'] ?? (! $isSource && $this->machineForNonSource),
                'translator_id' => $this->userId,
            ],
        );
        $this->stats['translations']++;
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

    private function upsertSpecs(Entry $entry, array $data): void
    {
        if (isset($data['profile'])) {
            CharacterProfile::updateOrCreate(['entry_id' => $entry->id], $data['profile']);
        }
        if (isset($data['vehicle'])) {
            VehicleSpec::updateOrCreate(['entry_id' => $entry->id], $data['vehicle']);
        }
        if (isset($data['weapon'])) {
            WeaponSpec::updateOrCreate(['entry_id' => $entry->id], $data['weapon']);
        }
        if (isset($data['mission'])) {
            MissionDetail::updateOrCreate(['entry_id' => $entry->id], $data['mission']);
        }
    }

    private function category(string $type, string $key): Category
    {
        return Category::firstOrCreate(['type' => $type, 'key' => $key], ['names' => self::CATEGORY_NAMES[$key]]);
    }

    public function importRelations(array $relations): void
    {
        $ids = Entry::pluck('id', 'key');
        foreach ($relations as [$from, $to, $type, $note]) {
            if (! isset($ids[$from], $ids[$to])) {
                continue;
            }
            EntryRelation::updateOrCreate(
                ['from_entry_id' => $ids[$from], 'to_entry_id' => $ids[$to], 'relation_type' => $type],
                ['note' => $note, 'created_by' => $this->userId],
            );
            $this->stats['relations']++;
        }
    }

    public function importMarkers(array $markers): void
    {
        $ids = Entry::pluck('id', 'key');
        foreach ($markers as [$key, $category, $x, $y, $basis, $zoom]) {
            if (! isset($ids[$key])) {
                continue;
            }
            MapMarker::updateOrCreate(
                ['entry_id' => $ids[$key], 'category' => $category],
                [
                    'x' => $x,
                    'y' => $y,
                    'precision' => 'approximate',
                    'approximation_basis' => $basis,
                    'zoom' => $zoom,
                    'status' => 'published',
                    'updated_by' => $this->userId,
                ],
            );
            $this->stats['markers']++;
        }
    }
}
