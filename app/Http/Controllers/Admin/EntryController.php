<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Entry;
use App\Models\EntryRelation;
use App\Models\EntryTranslation;
use App\Models\Media;
use App\Models\Source;
use App\Models\Tag;
use App\Services\EntryPresenter;
use App\Services\EntryService;
use App\Support\Audit;
use App\Support\Locales;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class EntryController extends Controller
{
    public function __construct(private EntryService $service) {}

    public function index(Request $request): Response
    {
        Gate::authorize('content.view');
        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:100'],
            'type' => ['nullable', Rule::in(array_keys(config('atlas.types')))],
            'status' => ['nullable', Rule::in([...config('atlas.statuses'), 'trashed'])],
            'verification' => ['nullable', Rule::in(config('atlas.verification'))],
            'sort' => ['nullable', Rule::in(['updated_at', 'title', 'type', 'status', 'verification'])],
            'dir' => ['nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['nullable', 'integer', Rule::in([25, 50, 100])],
        ]);

        $query = Entry::query()->with(['translations:id,entry_id,locale,title,status,is_machine', 'editor:id,name']);
        if (($filters['status'] ?? null) === 'trashed') {
            $query->onlyTrashed();
        } elseif (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        foreach (['type', 'verification'] as $f) {
            if (! empty($filters[$f])) {
                $query->where($f, $filters[$f]);
            }
        }
        if (! empty($filters['q'])) {
            $like = '%'.addcslashes(mb_strtolower($filters['q']), '%_\\').'%';
            $query->where(fn ($w) => $w->where('key', 'like', $like)->orWhereHas('translations', fn ($t) => $t->where('search_text', 'like', $like)));
        }

        $sort = $filters['sort'] ?? 'updated_at';
        $dir = $filters['dir'] ?? ($sort === 'updated_at' ? 'desc' : 'asc');
        if ($sort === 'title') {
            $query->orderBy(EntryTranslation::select('title')->whereColumn('entry_id', 'entries.id')->where('locale', 'en')->limit(1), $dir);
        } else {
            $query->orderBy($sort, $dir);
        }

        $page = $query->paginate($filters['per_page'] ?? 25)->withQueryString();
        $locales = Locales::codes();

        return Inertia::render('admin/entries/index', [
            'entries' => collect($page->items())->map(fn (Entry $e) => [
                'id' => $e->id,
                'key' => $e->key,
                'type' => $e->type,
                'title' => $e->label('en'),
                'status' => $e->status,
                'verification' => $e->verification,
                'featured' => $e->featured,
                'updated_at' => $e->updated_at?->toIso8601String(),
                'editor' => $e->editor?->name,
                'deleted_at' => $e->deleted_at?->toIso8601String(),
                'locales' => collect($locales)->mapWithKeys(fn ($l) => [$l => $e->translation($l)?->status])->all(),
            ]),
            'pagination' => ['current' => $page->currentPage(), 'last' => $page->lastPage(), 'total' => $page->total(), 'per_page' => $page->perPage()],
            'filters' => $filters,
            'types' => array_keys(config('atlas.types')),
        ]);
    }

    public function create(Request $request): Response
    {
        Gate::authorize('content.create');
        $type = $request->query('type');
        abort_unless(array_key_exists($type, config('atlas.types')), 404);

        return Inertia::render('admin/entries/edit', $this->formProps(null, $type));
    }

    public function edit(int $id): Response
    {
        Gate::authorize('content.view');
        $entry = Entry::withTrashed()->with(['translations', 'tags', 'media', 'sources', 'vehicleSpec', 'characterProfile', 'weaponSpec', 'missionDetail', 'markers', 'verificationEvents.user:id,name', 'revisions.user:id,name', 'outgoingRelations.to.translations', 'incomingRelations.from.translations'])->findOrFail($id);

        return Inertia::render('admin/entries/edit', $this->formProps($entry, $entry->type));
    }

    private function formProps(?Entry $entry, string $type): array
    {
        $source = $entry?->translation(config('atlas.default_locale'));
        $spec = $entry ? ($entry->vehicleSpec ?? $entry->characterProfile ?? $entry->weaponSpec ?? $entry->missionDetail) : null;

        return [
            'type' => $type,
            'entry' => $entry ? [
                'id' => $entry->id,
                'key' => $entry->key,
                'type' => $entry->type,
                'status' => $entry->status,
                'verification' => $entry->verification,
                'confidence' => $entry->confidence,
                'spoiler_level' => $entry->spoiler_level,
                'featured' => $entry->featured,
                'sort_order' => $entry->sort_order,
                'region_id' => $entry->region_id,
                'category_id' => $entry->category_id,
                'hero_media_id' => $entry->hero_media_id,
                'art_preset' => $entry->art_preset,
                'event_date' => $entry->event_date?->toDateString(),
                'attributes' => $entry->attributes ?? (object) [],
                'research_notes' => $entry->research_notes,
                'last_verified_at' => $entry->last_verified_at?->toIso8601String(),
                'deleted_at' => $entry->deleted_at?->toIso8601String(),
                'source' => $source ? $source->only(['title', 'slug', 'summary', 'body', 'fields', 'aliases', 'seo_title', 'seo_description', 'status']) : null,
                'specs' => $spec ? collect($spec->toArray())->only(EntryService::SPEC_FIELDS[$type] ?? [])->all() : (object) [],
                'tags' => $entry->tags->pluck('id'),
                'gallery' => $entry->media->where('pivot.role', 'gallery')->pluck('id')->values(),
                'videos' => $entry->media->where('pivot.role', 'video')->map(fn ($m) => $m->present('en'))->values(),
                'sources' => $entry->sources->map(fn ($s) => ['id' => $s->id, 'title' => $s->title, 'url' => $s->url, 'publisher' => $s->publisher, 'type' => $s->source_type, 'published_on' => $s->published_on?->toDateString(), 'note' => $s->pivot->evidence_note, 'supports' => $s->pivot->supports]),
                'relations' => $entry->outgoingRelations->toBase()->map(fn ($r) => ['id' => $r->id, 'direction' => 'out', 'type' => $r->relation_type, 'note' => $r->note, 'other' => $r->to ? ['id' => $r->to->id, 'title' => $r->to->label('en'), 'type' => $r->to->type] : null])
                    ->merge($entry->incomingRelations->toBase()->map(fn ($r) => ['id' => $r->id, 'direction' => 'in', 'type' => $r->relation_type, 'note' => $r->note, 'other' => $r->from ? ['id' => $r->from->id, 'title' => $r->from->label('en'), 'type' => $r->from->type] : null]))
                    ->filter(fn ($r) => $r['other'])->values(),
                'markers' => $entry->markers->map->only(['id', 'x', 'y', 'category', 'precision', 'status']),
                'translations' => collect(Locales::codes())->mapWithKeys(fn ($l) => [$l => ($t = $entry->translation($l)) ? ['status' => $t->status, 'is_machine' => $t->is_machine, 'updated_at' => $t->updated_at?->toIso8601String()] : null]),
                'history' => $entry->verificationEvents->map(fn ($v) => ['from' => $v->from_status, 'to' => $v->to_status, 'note' => $v->note, 'user' => $v->user?->name, 'date' => $v->created_at?->toIso8601String()]),
                'revisions' => $entry->revisions->take(30)->map(fn ($r) => ['id' => $r->id, 'summary' => $r->summary, 'locale' => $r->locale, 'user' => $r->user?->name, 'date' => $r->created_at?->toIso8601String()]),
                'public_url' => $entry->status === 'published' ? EntryPresenter::url($entry->loadMissing('translations'), 'en') : null,
            ] : null,
            'options' => [
                'statuses' => config('atlas.statuses'),
                'verification' => config('atlas.verification'),
                'confidence' => config('atlas.confidence'),
                'spoiler_levels' => config('atlas.spoiler_levels'),
                'relation_types' => config('atlas.relation_types'),
                'regions' => Entry::where('type', 'region')->with('translations')->get()->map(fn ($r) => ['id' => $r->id, 'title' => $r->label('en')]),
                'categories' => Category::where('type', $type)->get()->map(fn ($c) => ['id' => $c->id, 'name' => $c->name('en')]),
                'tags' => Tag::orderBy('key')->get()->map(fn ($t) => ['id' => $t->id, 'key' => $t->key, 'name' => $t->name('en')]),
                'media' => Media::where('kind', 'image')->latest()->limit(200)->get()->map(fn ($m) => $m->present('en')),
                'locales' => Locales::codes(),
            ],
        ];
    }

    private function rules(?Entry $entry, string $type): array
    {
        $specRules = [
            'vehicle' => [
                'specs.manufacturer' => ['nullable', 'string', 'max:120'],
                'specs.model' => ['nullable', 'string', 'max:120'],
                'specs.vehicle_class' => ['required', Rule::in(['car', 'sports', 'muscle', 'suv', 'truck', 'motorcycle', 'boat', 'aircraft', 'emergency', 'offroad', 'industrial'])],
                'specs.body_style' => ['nullable', 'string', 'max:32'],
                'specs.real_world_inspiration' => ['nullable', 'string', 'max:160'],
                'specs.inspiration_verification' => ['nullable', Rule::in(config('atlas.verification'))],
                'specs.top_speed' => ['nullable', 'integer', 'between:0,100'],
                'specs.acceleration' => ['nullable', 'integer', 'between:0,100'],
                'specs.braking' => ['nullable', 'integer', 'between:0,100'],
                'specs.handling' => ['nullable', 'integer', 'between:0,100'],
                'specs.durability' => ['nullable', 'integer', 'between:0,100'],
                'specs.seats' => ['nullable', 'integer', 'between:1,60'],
                'specs.drivetrain' => ['nullable', Rule::in(['fwd', 'rwd', 'awd', '4wd'])],
                'specs.stats_verification' => ['nullable', Rule::in([...config('atlas.verification'), 'unknown'])],
                'specs.first_seen' => ['nullable', 'string', 'max:120'],
            ],
            'character' => [
                'specs.full_name' => ['nullable', 'string', 'max:160'],
                'specs.role' => ['required', Rule::in(['protagonist', 'supporting', 'minor'])],
                'specs.affiliation' => ['nullable', 'string', 'max:200'],
                'specs.voice_actor' => ['nullable', 'string', 'max:120'],
                'specs.voice_actor_verification' => ['nullable', Rule::in(config('atlas.verification'))],
                'specs.first_seen' => ['nullable', 'string', 'max:120'],
            ],
            'weapon' => [
                'specs.weapon_class' => ['required', Rule::in(['handgun', 'smg', 'shotgun', 'rifle', 'sniper', 'heavy', 'melee', 'throwable', 'unknown'])],
                'specs.damage' => ['nullable', 'integer', 'between:0,100'],
                'specs.fire_rate' => ['nullable', 'integer', 'between:0,100'],
                'specs.range' => ['nullable', 'integer', 'between:0,100'],
                'specs.accuracy' => ['nullable', 'integer', 'between:0,100'],
                'specs.magazine' => ['nullable', 'integer', 'between:0,1000'],
                'specs.stats_verification' => ['nullable', Rule::in([...config('atlas.verification'), 'unknown'])],
                'specs.first_seen' => ['nullable', 'string', 'max:120'],
            ],
            'mission' => [
                'specs.mission_type' => ['required', Rule::in(['main', 'side', 'story_arc', 'activity'])],
                'specs.sequence' => ['nullable', 'integer', 'min:0'],
                'specs.missable' => ['boolean'],
                'specs.reward_cash' => ['nullable', 'integer', 'min:0'],
            ],
        ];

        return array_merge([
            'key' => ['required', 'string', 'max:128', 'regex:/^[a-z0-9-]+$/', Rule::unique('entries', 'key')->ignore($entry?->id)],
            'status' => ['required', Rule::in(config('atlas.statuses'))],
            'verification' => ['required', Rule::in(config('atlas.verification'))],
            'confidence' => ['required', Rule::in(config('atlas.confidence'))],
            'spoiler_level' => ['required', Rule::in(config('atlas.spoiler_levels'))],
            'featured' => ['boolean'],
            'sort_order' => ['nullable', 'integer', 'between:-9999,9999'],
            'region_id' => ['nullable', 'integer', Rule::exists('entries', 'id')->where('type', 'region')],
            'category_id' => ['nullable', 'integer', Rule::exists('categories', 'id')->where('type', $type)],
            'hero_media_id' => ['nullable', 'integer', Rule::exists('media', 'id')->whereNull('deleted_at')],
            'art_preset' => ['nullable', 'string', 'max:64', 'regex:/^[a-z0-9-]+$/'],
            'event_date' => ['nullable', 'date'],
            'attributes' => ['nullable', 'array'],
            'research_notes' => ['nullable', 'string', 'max:10000'],
            'verification_note' => ['nullable', 'string', 'max:1000'],
            'mark_verified' => ['boolean'],
            'tags' => ['array'],
            'tags.*' => ['integer', 'exists:tags,id'],
            'gallery' => ['array', 'max:40'],
            'gallery.*' => ['integer', Rule::exists('media', 'id')->whereNull('deleted_at')],
            'source.title' => ['required', 'string', 'max:255'],
            'source.slug' => ['nullable', 'string', 'max:191'],
            'source.summary' => ['nullable', 'string', 'max:2000'],
            'source.body' => ['nullable', 'string', 'max:60000'],
            'source.fields' => ['nullable', 'array'],
            'source.aliases' => ['nullable', 'array', 'max:20'],
            'source.aliases.*' => ['string', 'max:120'],
            'source.seo_title' => ['nullable', 'string', 'max:255'],
            'source.seo_description' => ['nullable', 'string', 'max:320'],
            'source.status' => ['nullable', Rule::in(config('atlas.translation_statuses'))],
        ], $specRules[$type] ?? []);
    }

    public function store(Request $request): RedirectResponse
    {
        Gate::authorize('content.create');
        $type = $request->input('type');
        abort_unless(array_key_exists($type, config('atlas.types')), 422);
        $data = $request->validate($this->rules(null, $type));
        $data['type'] = $type;

        // Contributors can draft but never publish directly.
        if (! $request->user()->hasPermission('content.publish')) {
            $data['status'] = in_array($data['status'], ['draft', 'review']) ? $data['status'] : 'review';
            $data['source']['status'] = 'draft';
            $data['featured'] = false;
        }
        $data['source']['status'] ??= $data['status'] === 'published' ? 'published' : 'draft';

        $entry = $this->service->save(null, $data, $request->user());

        return redirect()->route('admin.entries.edit', $entry->id)->with('success', 'Entry created.');
    }

    public function update(Request $request, int $id): RedirectResponse
    {
        Gate::authorize('content.edit');
        $entry = Entry::findOrFail($id);
        $data = $request->validate($this->rules($entry, $entry->type));
        $data['type'] = $entry->type;

        if ($data['status'] !== $entry->status && ($data['status'] === 'published' || $entry->status === 'published')) {
            Gate::authorize('content.publish');
        }
        if ($data['verification'] !== $entry->verification) {
            Gate::authorize('content.verify');
        }

        $this->service->save($entry, $data, $request->user());

        return back()->with('success', 'Changes saved.');
    }

    public function bulk(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1', 'max:200'],
            'ids.*' => ['integer'],
            'action' => ['required', Rule::in(['publish', 'unpublish', 'archive', 'delete', 'restore'])],
        ]);
        Gate::authorize(in_array($data['action'], ['delete', 'restore']) ? 'content.delete' : 'content.publish');

        $entries = Entry::withTrashed()->whereIn('id', $data['ids'])->get();
        foreach ($entries as $entry) {
            match ($data['action']) {
                'publish' => $entry->update(['status' => 'published', 'published_at' => $entry->published_at ?? now(), 'updated_by' => $request->user()->id]),
                'unpublish' => $entry->update(['status' => 'draft', 'updated_by' => $request->user()->id]),
                'archive' => $entry->update(['status' => 'archived', 'updated_by' => $request->user()->id]),
                'delete' => $entry->delete(),
                'restore' => $entry->restore(),
            };
            if ($data['action'] === 'publish') {
                // Publishing an entry publishes its English source translation so the page can render.
                $entry->translations()->where('locale', config('atlas.default_locale'))->update(['status' => 'published']);
            }
            Audit::log("entry.{$data['action']}", $entry);
        }

        return back()->with('success', count($entries).' entries updated.');
    }

    public function destroy(int $id): RedirectResponse
    {
        Gate::authorize('content.delete');
        $entry = Entry::findOrFail($id);
        $entry->delete();
        Audit::log('entry.deleted', $entry);

        return redirect()->route('admin.entries.index')->with('success', 'Entry moved to trash. It can be restored.');
    }

    public function restore(int $id): RedirectResponse
    {
        Gate::authorize('content.delete');
        $entry = Entry::onlyTrashed()->findOrFail($id);
        $entry->restore();
        Audit::log('entry.restored', $entry);

        return back()->with('success', 'Entry restored.');
    }

    public function duplicates(Request $request): JsonResponse
    {
        Gate::authorize('content.view');
        $data = $request->validate([
            'type' => ['required', Rule::in(array_keys(config('atlas.types')))],
            'title' => ['required', 'string', 'max:255'],
            'ignore' => ['nullable', 'integer'],
        ]);

        return response()->json(['data' => $this->service->findDuplicates($data['type'], $data['title'], $data['ignore'] ?? null)]);
    }

    /** Lookup endpoint for relation pickers. */
    public function lookup(Request $request): JsonResponse
    {
        Gate::authorize('content.view');
        $q = mb_strtolower((string) $request->string('q')->limit(80));
        $like = '%'.addcslashes($q, '%_\\').'%';

        $entries = Entry::query()->with('translations')
            ->when($q !== '', fn ($w) => $w->where(fn ($x) => $x->where('key', 'like', $like)->orWhereHas('translations', fn ($t) => $t->where('search_text', 'like', $like))))
            ->limit(15)->get();

        return response()->json(['data' => $entries->map(fn ($e) => ['id' => $e->id, 'title' => $e->label('en'), 'type' => $e->type, 'status' => $e->status])]);
    }

    public function preview(Request $request, int $id): Response
    {
        Gate::authorize('content.view');
        $locale = Locales::isValid($request->query('locale')) ? $request->query('locale') : 'en';
        app()->setLocale($locale);
        $entry = Entry::withTrashed()->with(EntryPresenter::CARD_RELATIONS)->findOrFail($id);
        // Preview treats every translation as published so drafts can be reviewed in context.
        $entry->translations->each(fn ($t) => $t->status = 'published');
        $data = EntryPresenter::full($entry, $locale);

        return Inertia::render('site/entry', [
            'entry' => $data,
            'sectionKey' => config("atlas.types.{$entry->type}.section"),
            'breadcrumbs' => [],
            'switcher' => [],
            'preview' => true,
            'meta' => ['title' => 'Preview — '.$data['title'], 'noindex' => true],
        ]);
    }

    public function storeRelation(Request $request, int $id): RedirectResponse
    {
        Gate::authorize('relations.edit');
        $entry = Entry::findOrFail($id);
        $data = $request->validate([
            'to_entry_id' => ['required', 'integer', Rule::exists('entries', 'id')->whereNull('deleted_at')],
            'relation_type' => ['required', Rule::in(config('atlas.relation_types'))],
            'note' => ['nullable', 'string', 'max:255'],
        ]);
        abort_if((int) $data['to_entry_id'] === $entry->id, 422, 'An entry cannot relate to itself.');

        $exists = EntryRelation::where('relation_type', $data['relation_type'])
            ->where(fn ($w) => $w
                ->where(fn ($q) => $q->where('from_entry_id', $entry->id)->where('to_entry_id', $data['to_entry_id']))
                ->orWhere(fn ($q) => $q->where('from_entry_id', $data['to_entry_id'])->where('to_entry_id', $entry->id)))
            ->exists();
        if ($exists) {
            return back()->with('error', 'That relationship already exists.');
        }

        EntryRelation::create([...$data, 'from_entry_id' => $entry->id, 'created_by' => $request->user()->id]);
        Audit::log('relation.created', $entry, ['to' => $data['to_entry_id'], 'type' => $data['relation_type']]);

        return back()->with('success', 'Relationship added.');
    }

    public function destroyRelation(int $id, int $relation): RedirectResponse
    {
        Gate::authorize('relations.edit');
        $rel = EntryRelation::where(fn ($q) => $q->where('from_entry_id', $id)->orWhere('to_entry_id', $id))->findOrFail($relation);
        $rel->delete();
        Audit::log('relation.deleted', Entry::find($id), ['relation' => $relation]);

        return back()->with('success', 'Relationship removed.');
    }

    public function attachSource(Request $request, int $id): RedirectResponse
    {
        Gate::authorize('content.verify');
        $entry = Entry::findOrFail($id);
        $data = $request->validate([
            'url' => ['required', 'url:http,https', 'max:2048'],
            'title' => ['required', 'string', 'max:255'],
            'publisher' => ['nullable', 'string', 'max:160'],
            'type' => ['required', Rule::in(['official', 'press', 'community', 'wiki', 'video'])],
            'published_on' => ['nullable', 'date'],
            'note' => ['nullable', 'string', 'max:2000'],
            'supports' => ['required', Rule::in(['primary', 'context', 'disputes'])],
        ]);
        $source = Source::firstOrNew(['url_hash' => Source::hashUrl($data['url'])]);
        if (! $source->exists) {
            $source->fill(['url' => $data['url'], 'title' => $data['title'], 'publisher' => $data['publisher'], 'source_type' => $data['type'], 'published_on' => $data['published_on'], 'accessed_on' => now()])->save();
        }
        $entry->sources()->syncWithoutDetaching([$source->id => ['evidence_note' => $data['note'], 'supports' => $data['supports']]]);
        Audit::log('source.attached', $entry, ['source' => $source->id]);

        return back()->with('success', $source->wasRecentlyCreated ? 'Source added.' : 'Existing source linked (duplicate URL detected).');
    }

    public function detachSource(int $id, int $source): RedirectResponse
    {
        Gate::authorize('content.verify');
        $entry = Entry::findOrFail($id);
        $entry->sources()->detach($source);
        Audit::log('source.detached', $entry, ['source' => $source]);

        return back()->with('success', 'Source removed from entry.');
    }
}
