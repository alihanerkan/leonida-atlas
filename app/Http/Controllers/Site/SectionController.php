<?php

namespace App\Http\Controllers\Site;

use App\Http\Controllers\Controller;
use App\Models\Entry;
use App\Models\EntryTranslation;
use App\Models\Source;
use App\Models\Tag;
use App\Models\VehicleSpec;
use App\Services\EntryPresenter;
use App\Services\SearchService;
use App\Support\Dictionary;
use App\Support\Locales;
use App\Support\Seo;
use App\Support\Settings;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Resolves localized section segments (e.g. /tr/araclar) to the right page.
 */
class SectionController extends Controller
{
    public function index(Request $request, string $segment): Response
    {
        $locale = app()->getLocale();
        $section = Locales::sectionFromSegment($segment, $locale);
        abort_if($section === null, 404);

        return match ($section) {
            'map' => app(MapController::class)->page($request),
            'search' => $this->search($request, $locale),
            'tracker' => $this->tracker($locale),
            'compare' => $this->compare($request, $locale),
            'about', 'legal' => $this->staticPage($section, $locale),
            'sources' => $this->sources($locale),
            'contribute' => $this->contribute($locale),
            default => $this->listing($request, $section, $locale),
        };
    }

    public function show(Request $request, string $segment, string $slug): Response
    {
        $locale = app()->getLocale();
        $section = Locales::sectionFromSegment($segment, $locale);
        $types = config("atlas.content_sections.$section");
        abort_if(! $types, 404);

        // Slugs resolve within the locale first, then the English source (fallback pages).
        $entry = null;
        foreach (array_unique([$locale, config('atlas.default_locale')]) as $try) {
            $entry = EntryPresenter::publicQuery()->ofTypes($types)
                ->whereHas('translations', fn ($q) => $q->where('locale', $try)->where('slug', $slug)->where('status', 'published'))
                ->first();
            if ($entry) {
                break;
            }
        }
        abort_if(! $entry, 404);

        $data = EntryPresenter::full($entry, $locale);
        // Redirect to the canonical localized slug when the URL used the source slug but a translation exists.
        if (! $data['fallback'] && $data['slug'] !== $slug) {
            return Inertia::location($data['url']);
        }

        $sectionLabel = Dictionary::t("nav.$section");
        $sourceUrl = $data['alternates'][config('atlas.default_locale')] ?? $data['url'];

        return Inertia::render('site/entry', [
            'entry' => $data,
            'sectionKey' => $section,
            'breadcrumbs' => [
                ['title' => Dictionary::t('nav.home'), 'href' => Locales::url($locale)],
                ['title' => $sectionLabel, 'href' => Locales::url($locale, $section)],
                ['title' => $data['title'], 'href' => $data['url']],
            ],
            'switcher' => $data['switcher'],
            'meta' => Seo::meta(
                $data['title'],
                $data['summary'],
                $data['url'],
                $data['alternates'],
                [
                    'og_type' => 'article',
                    // Fallback pages point search engines at the source-language original.
                    'canonical_path' => $data['fallback'] ? $sourceUrl : $data['url'],
                    'noindex' => $data['fallback'],
                    'jsonld' => $this->jsonLd($data, $locale, $section),
                ],
            ),
        ]);
    }

    private function jsonLd(array $data, string $locale, string $section): array
    {
        $crumbs = [
            ['name' => Dictionary::t('nav.home'), 'url' => Locales::url($locale)],
            ['name' => Dictionary::t("nav.$section"), 'url' => Locales::url($locale, $section)],
            ['name' => $data['title'], 'url' => $data['url']],
        ];

        return [
            '@context' => 'https://schema.org',
            '@graph' => [
                [
                    '@type' => in_array($data['type'], ['news', 'trailer']) ? 'NewsArticle' : 'Article',
                    'headline' => $data['title'],
                    'description' => $data['summary'],
                    'inLanguage' => $data['locale'],
                    'dateModified' => $data['updated_at'],
                    'datePublished' => $data['published_at'],
                    'isBasedOn' => collect($data['sources'])->pluck('url')->take(5)->values(),
                    'publisher' => ['@type' => 'Organization', 'name' => Settings::siteName()],
                ],
                [
                    '@type' => 'BreadcrumbList',
                    'itemListElement' => collect($crumbs)->values()->map(fn ($c, $i) => [
                        '@type' => 'ListItem',
                        'position' => $i + 1,
                        'name' => $c['name'],
                        'item' => Locales::absolute($c['url']),
                    ]),
                ],
            ],
        ];
    }

    private function listing(Request $request, string $section, string $locale): Response
    {
        $types = config("atlas.content_sections.$section");
        abort_if(! $types, 404);

        $filters = $request->validate([
            'verification' => ['nullable', Rule::in(config('atlas.verification'))],
            'tag' => ['nullable', 'string', 'max:64'],
            'region' => ['nullable', 'integer'],
            'type' => ['nullable', Rule::in($types)],
            'class' => ['nullable', 'string', 'max:32'],
            'sort' => ['nullable', Rule::in(['featured', 'az', 'recent', 'verification'])],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);

        $query = EntryPresenter::publicQuery()->ofTypes($types);
        if (! empty($filters['verification'])) {
            $query->where('verification', $filters['verification']);
        }
        if (! empty($filters['type'])) {
            $query->where('type', $filters['type']);
        }
        if (! empty($filters['region'])) {
            $query->where('region_id', $filters['region']);
        }
        if (! empty($filters['tag'])) {
            $query->whereHas('tags', fn ($q) => $q->where('key', $filters['tag']));
        }
        if (! empty($filters['class'])) {
            $query->whereHas('vehicleSpec', fn ($q) => $q->where('vehicle_class', $filters['class']));
        }

        $sort = $filters['sort'] ?? (in_array('news', $types) ? 'recent' : 'featured');
        match ($sort) {
            'recent' => $query->orderByDesc('event_date')->orderByDesc('updated_at'),
            'verification' => $query->orderByRaw($this->verificationOrderSql()),
            'az' => $query
                ->orderBy(EntryTranslation::select('title')->whereColumn('entry_translations.entry_id', 'entries.id')->where('locale', $locale)->where('status', 'published')->limit(1))
                ->orderBy(EntryTranslation::select('title')->whereColumn('entry_translations.entry_id', 'entries.id')->where('locale', config('atlas.default_locale'))->limit(1)),
            default => $query->orderByDesc('featured')->orderBy('sort_order')->orderBy('id'),
        };

        $paginator = $query->paginate(24)->withQueryString();
        $cards = EntryPresenter::cards($paginator->items(), $locale);

        $all = Entry::published()->ofTypes($types);
        $facets = [
            'verification' => (clone $all)->selectRaw('verification, count(*) as c')->groupBy('verification')->pluck('c', 'verification'),
            'tags' => Tag::whereHas('entries', fn ($q) => $q->published()->ofTypes($types))->get()->map(fn ($t) => ['key' => $t->key, 'name' => $t->name($locale)])->values(),
            'regions' => EntryPresenter::cards(EntryPresenter::publicQuery()->ofTypes(['region'])->whereIn('id', (clone $all)->whereNotNull('region_id')->pluck('region_id'))->get(), $locale),
            'classes' => in_array('vehicle', $types) ? VehicleSpec::whereHas('entry', fn ($q) => $q->published())->distinct()->pluck('vehicle_class') : [],
            'types' => count($types) > 1 ? $types : [],
        ];

        return Inertia::render('site/section', [
            'section' => $section,
            'items' => $cards,
            'pagination' => [
                'current' => $paginator->currentPage(),
                'last' => $paginator->lastPage(),
                'total' => $paginator->total(),
                'prev' => $paginator->previousPageUrl(),
                'next' => $paginator->nextPageUrl(),
            ],
            'filters' => array_merge(['sort' => $sort], $filters),
            'facets' => $facets,
            'meta' => Seo::meta(
                Dictionary::t("nav.$section"),
                Dictionary::t("sections.$section.description"),
                Locales::url($locale, $section),
                Seo::sectionAlternates($section),
                ['noindex' => count(array_diff(array_keys($filters), ['page'])) > 0],
            ),
        ]);
    }

    private function verificationOrderSql(): string
    {
        $cases = collect(config('atlas.verification'))->values()->map(fn ($v, $i) => "WHEN '$v' THEN $i")->implode(' ');

        return "CASE verification $cases ELSE 99 END";
    }

    private function search(Request $request, string $locale): Response
    {
        $q = (string) $request->string('q')->limit(100);
        $section = $request->query('section');
        if (! is_string($section) || ! array_key_exists($section, config('atlas.content_sections'))) {
            $section = null;
        }
        $results = $q !== '' ? app(SearchService::class)->search($q, $locale, $section, 50) : [];

        return Inertia::render('site/search', [
            'q' => $q,
            'section' => $section,
            'results' => $results,
            'suggestions' => EntryPresenter::cards(EntryPresenter::publicQuery()->where('featured', true)->orderBy('sort_order')->limit(6)->get(), $locale),
            'meta' => Seo::meta(Dictionary::t('nav.search'), Dictionary::t('meta.search_description'), Locales::url($locale, 'search'), Seo::sectionAlternates('search'), ['noindex' => true]),
        ]);
    }

    private function tracker(string $locale): Response
    {
        $trackable = collect(config('atlas.types'))->filter(fn ($t) => $t['trackable'])->keys()->all();
        $entries = EntryPresenter::publicQuery()->ofTypes($trackable)->orderBy('type')->orderBy('sort_order')->get();

        return Inertia::render('site/tracker', [
            'entries' => EntryPresenter::cards($entries, $locale),
            'meta' => Seo::meta(Dictionary::t('nav.tracker'), Dictionary::t('meta.tracker_description'), Locales::url($locale, 'tracker'), Seo::sectionAlternates('tracker'), ['noindex' => true]),
        ]);
    }

    private function compare(Request $request, string $locale): Response
    {
        $vehicles = EntryPresenter::publicQuery()->ofTypes(['vehicle'])->with('vehicleSpec')->orderBy('sort_order')->get();
        $ids = collect(explode(',', (string) $request->query('ids')))->map(fn ($i) => (int) $i)->filter()->take(4)->values();

        return Inertia::render('site/compare', [
            'vehicles' => $vehicles->map(function (Entry $e) use ($locale) {
                $card = EntryPresenter::card($e, $locale);

                return $card ? array_merge($card, ['specs' => $e->vehicleSpec?->only(['manufacturer', 'model', 'vehicle_class', 'body_style', 'real_world_inspiration', 'inspiration_verification', 'top_speed', 'acceleration', 'braking', 'handling', 'durability', 'seats', 'drivetrain', 'stats_verification', 'first_seen'])]) : null;
            })->filter()->values(),
            'selected' => $ids,
            'meta' => Seo::meta(Dictionary::t('nav.compare'), Dictionary::t('meta.compare_description'), Locales::url($locale, 'compare'), Seo::sectionAlternates('compare')),
        ]);
    }

    private function staticPage(string $page, string $locale): Response
    {
        return Inertia::render("site/$page", [
            'meta' => Seo::meta(Dictionary::t("nav.$page"), Dictionary::t("meta.{$page}_description"), Locales::url($locale, $page), Seo::sectionAlternates($page)),
        ]);
    }

    private function sources(string $locale): Response
    {
        $sources = Source::withCount('entries')->orderBy('source_type')->orderByDesc('published_on')->get();

        return Inertia::render('site/sources', [
            'sources' => $sources->map(fn ($s) => [
                'id' => $s->id,
                'title' => $s->title,
                'url' => $s->url,
                'publisher' => $s->publisher,
                'type' => $s->source_type,
                'published_on' => $s->published_on?->toDateString(),
                'accessed_on' => $s->accessed_on?->toDateString(),
                'entries' => $s->entries_count,
            ]),
            'meta' => Seo::meta(Dictionary::t('nav.sources'), Dictionary::t('meta.sources_description'), Locales::url($locale, 'sources'), Seo::sectionAlternates('sources')),
        ]);
    }

    private function contribute(string $locale): Response
    {
        return Inertia::render('site/contribute', [
            'types' => array_keys(config('atlas.types')),
            'meta' => Seo::meta(Dictionary::t('nav.contribute'), Dictionary::t('meta.contribute_description'), Locales::url($locale, 'contribute'), Seo::sectionAlternates('contribute')),
        ]);
    }
}
