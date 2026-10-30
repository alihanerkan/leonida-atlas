<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Entry;
use App\Models\EntryTranslation;
use App\Services\EntryPresenter;
use App\Services\EntryService;
use App\Support\Audit;
use App\Support\Locales;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class TranslationController extends Controller
{
    public function __construct(private EntryService $service) {}

    public function index(Request $request): Response
    {
        Gate::authorize('translations.edit');
        $filters = $request->validate([
            'locale' => ['nullable', Rule::in(Locales::codes())],
            'type' => ['nullable', Rule::in(array_keys(config('atlas.types')))],
            'state' => ['nullable', Rule::in(['missing', 'draft', 'review', 'published', 'machine'])],
            'status' => ['nullable', Rule::in(config('atlas.statuses'))],
            'q' => ['nullable', 'string', 'max:100'],
        ]);

        $query = Entry::query()->with('translations:id,entry_id,locale,title,status,is_machine,reviewed_at,updated_at');
        if (! empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }
        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        }
        if (! empty($filters['q'])) {
            $like = '%'.addcslashes(mb_strtolower($filters['q']), '%_\\').'%';
            $query->whereHas('translations', fn ($t) => $t->where('search_text', 'like', $like));
        }
        if (! empty($filters['locale']) && ! empty($filters['state'])) {
            $l = $filters['locale'];
            match ($filters['state']) {
                'missing' => $query->whereDoesntHave('translations', fn ($t) => $t->where('locale', $l)),
                'machine' => $query->whereHas('translations', fn ($t) => $t->where('locale', $l)->where('is_machine', true)->whereNull('reviewed_at')),
                default => $query->whereHas('translations', fn ($t) => $t->where('locale', $l)->where('status', $filters['state'])),
            };
        }

        $page = $query->orderBy('type')->orderBy('sort_order')->paginate(50)->withQueryString();
        $locales = Locales::codes();

        $totals = collect($locales)->mapWithKeys(fn ($l) => [$l => EntryTranslation::whereHas('entry')->where('locale', $l)->where('status', 'published')->count()]);

        return Inertia::render('admin/translations/index', [
            'rows' => collect($page->items())->map(fn (Entry $e) => [
                'id' => $e->id,
                'type' => $e->type,
                'title' => $e->label('en'),
                'status' => $e->status,
                'cells' => collect($locales)->mapWithKeys(function ($l) use ($e) {
                    $t = $e->translation($l);

                    return [$l => $t ? ['status' => $t->status, 'machine' => $t->is_machine && ! $t->reviewed_at, 'updated_at' => $t->updated_at?->toIso8601String()] : null];
                }),
            ]),
            'pagination' => ['current' => $page->currentPage(), 'last' => $page->lastPage(), 'total' => $page->total()],
            'filters' => $filters,
            'totals' => $totals,
            'entryCount' => Entry::count(),
            'types' => array_keys(config('atlas.types')),
        ]);
    }

    public function edit(Request $request, int $id, string $locale): Response
    {
        Gate::authorize('translations.edit');
        abort_unless(Locales::isValid($locale), 404);
        Gate::authorize('translations.locale', $locale);
        $entry = Entry::with(['translations.translator:id,name', 'translations.reviewer:id,name'])->findOrFail($id);
        $source = $entry->translation(config('atlas.default_locale'));
        $target = $entry->translation($locale);
        $present = fn (?EntryTranslation $t) => $t ? [
            ...$t->only(['title', 'slug', 'summary', 'body', 'fields', 'aliases', 'seo_title', 'seo_description', 'status', 'is_machine']),
            'translator' => $t->translator?->name,
            'reviewer' => $t->reviewer?->name,
            'reviewed_at' => $t->reviewed_at?->toIso8601String(),
            'updated_at' => $t->updated_at?->toIso8601String(),
        ] : null;

        return Inertia::render('admin/translations/edit', [
            'entry' => ['id' => $entry->id, 'type' => $entry->type, 'key' => $entry->key, 'status' => $entry->status, 'title' => $entry->label('en')],
            'locale' => $locale,
            'source' => $present($source),
            'target' => $present($target),
            'overview' => collect(Locales::codes())->mapWithKeys(fn ($l) => [$l => ($t = $entry->translation($l)) ? ['status' => $t->status, 'machine' => $t->is_machine && ! $t->reviewed_at] : null]),
            'canPublish' => $request->user()->hasPermission('translations.publish'),
            'fallbackUrl' => $entry->status === 'published' ? EntryPresenter::url($entry, $locale) : null,
            'previewUrl' => route('admin.entries.preview', ['id' => $entry->id, 'locale' => $locale]),
        ]);
    }

    public function update(Request $request, int $id, string $locale): RedirectResponse
    {
        Gate::authorize('translations.edit');
        abort_unless(Locales::isValid($locale), 404);
        Gate::authorize('translations.locale', $locale);
        $entry = Entry::findOrFail($id);
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:191'],
            'summary' => ['nullable', 'string', 'max:2000'],
            'body' => ['nullable', 'string', 'max:60000'],
            'fields' => ['nullable', 'array'],
            'aliases' => ['nullable', 'array', 'max:20'],
            'aliases.*' => ['string', 'max:120'],
            'seo_title' => ['nullable', 'string', 'max:255'],
            'seo_description' => ['nullable', 'string', 'max:320'],
            'status' => ['required', Rule::in(config('atlas.translation_statuses'))],
            'is_machine' => ['boolean'],
            'mark_reviewed' => ['boolean'],
        ]);

        $current = $entry->translation($locale)?->status;
        if (($data['status'] === 'published' || $current === 'published') && $data['status'] !== $current) {
            Gate::authorize('translations.publish');
        }
        if (! empty($data['mark_reviewed'])) {
            Gate::authorize('translations.publish');
        }

        $this->service->saveTranslation($entry, $locale, $data, $request->user());

        return back()->with('success', 'Translation saved.');
    }

    /** Copies the source-language text into the target locale as an editable draft. */
    public function copyFromSource(Request $request, int $id, string $locale): RedirectResponse
    {
        Gate::authorize('translations.edit');
        abort_unless(Locales::isValid($locale) && $locale !== config('atlas.default_locale'), 404);
        Gate::authorize('translations.locale', $locale);
        $entry = Entry::with('translations')->findOrFail($id);
        $source = $entry->translation(config('atlas.default_locale'));
        abort_unless($source, 422, 'No source translation to copy.');
        if ($entry->translation($locale)) {
            return back()->with('error', 'A translation already exists for this locale.');
        }

        $this->service->saveTranslation($entry, $locale, [
            ...$source->only(['title', 'slug', 'summary', 'body', 'fields', 'aliases', 'seo_title', 'seo_description']),
            'status' => 'draft',
            'is_machine' => false,
        ], $request->user());

        return back()->with('success', 'Source copied as a draft. Translate it before publishing.');
    }

    public function destroy(int $id, string $locale): RedirectResponse
    {
        Gate::authorize('translations.publish');
        abort_if($locale === config('atlas.default_locale'), 422, 'The source translation cannot be deleted.');
        $entry = Entry::findOrFail($id);
        $entry->translations()->where('locale', $locale)->delete();
        Audit::log('translation.deleted', $entry, ['locale' => $locale]);

        return redirect()->route('admin.translations.index')->with('success', 'Translation removed.');
    }
}
