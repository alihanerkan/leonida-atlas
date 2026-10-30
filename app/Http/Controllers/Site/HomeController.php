<?php

namespace App\Http\Controllers\Site;

use App\Http\Controllers\Controller;
use App\Models\Entry;
use App\Models\EntryTranslation;
use App\Models\MapMarker;
use App\Models\Source;
use App\Services\EntryPresenter;
use App\Support\Dictionary;
use App\Support\Locales;
use App\Support\Seo;
use App\Support\Settings;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    /** Official screenshots used as the crossfading backdrop of the homepage hero, in order. */
    private const SCENES = ['vi-270', 'vi-243', 'vi-240', 'vi-235', 'vi-227'];

    public function __invoke(Request $request): Response
    {
        $locale = app()->getLocale();
        $q = fn (array $types) => EntryPresenter::publicQuery()->ofTypes($types);

        $regions = $q(['region'])->orderBy('sort_order')->get();
        $characters = $q(['character'])->orderByDesc('featured')->orderBy('sort_order')->limit(8)->get();
        $vehicles = $q(['vehicle'])->orderByDesc('featured')->orderBy('sort_order')->limit(8)->get();
        $mysteries = $q(['mystery'])->orderByDesc('featured')->orderBy('sort_order')->limit(6)->get();
        $guides = $q(['mission', 'activity'])->orderByDesc('featured')->orderBy('sort_order')->limit(6)->get();
        $updates = $q(['news', 'trailer'])->orderByDesc('event_date')->limit(6)->get();
        $trailers = $q(['trailer'])->orderByDesc('event_date')->get();

        $published = Entry::published();
        $stats = [
            'entries' => (clone $published)->count(),
            'sources' => Source::count(),
            'regions' => $regions->count(),
            'translations' => EntryTranslation::where('status', 'published')->count(),
            'locales' => count(Locales::codes()),
            'markers' => MapMarker::where('status', 'published')->count(),
        ];

        $site = Settings::siteName();
        $slotIds = collect(Settings::get('home_media', []) ?: []);
        $slotMedia = \App\Models\Media::whereIn('id', $slotIds->values())->get()->keyBy('id');

        return Inertia::render('site/home', [
            'regions' => EntryPresenter::cards($regions, $locale),
            'characters' => EntryPresenter::cards($characters, $locale),
            'vehicles' => EntryPresenter::cards($vehicles, $locale),
            'mysteries' => EntryPresenter::cards($mysteries, $locale),
            'guides' => EntryPresenter::cards($guides, $locale),
            'updates' => EntryPresenter::cards($updates, $locale),
            'trailers' => collect($trailers)->map(function (Entry $e) use ($locale) {
                $card = EntryPresenter::card($e, $locale);
                $video = $e->media()->wherePivot('role', 'video')->first();
                $card['video'] = $video ? ['provider' => $video->embed_provider, 'id' => $video->embed_id] : null;

                return $card;
            })->filter()->values(),
            'mapPreview' => MapController::markerPayload($locale, limit: 40),
            'hero' => [
                // Official artwork imported by the site owner (atlas:import-official), keyed hero-1 … hero-6.
                'artwork' => $slotIds->filter(fn ($id, $slot) => str_starts_with($slot, 'official-'))->sortKeys()
                    ->map(fn ($id) => $slotMedia->get($id)?->present($locale))->filter()->values(),
            ],
            'scenes' => \App\Models\Media::where('disk', 'screens')
                ->whereIn('path', array_map(fn ($f) => "screens/{$f}-1920.webp", self::SCENES))->get()
                ->sortBy(fn ($m) => array_search(basename($m->path, '-1920.webp'), self::SCENES))
                ->map(fn ($m) => $m->present($locale))->values(),
            // Every official still in the library for the drag gallery, newest screenshots first.
            'screens' => \App\Models\Media::where('disk', 'screens')->orderByDesc('path')->get()
                ->map(fn ($m) => $m->present($locale))->values(),
            'stats' => $stats,
            'truth' => Entry::published()->selectRaw('verification, count(*) as c')->groupBy('verification')->pluck('c', 'verification'),
            'sectionCounts' => collect(config('atlas.content_sections'))->map(fn ($types) => Entry::published()->whereIn('type', $types)->count()),
            'meta' => Seo::meta($site, Dictionary::t('meta.home_description'), Locales::url($locale), Seo::sectionAlternates(null), [
                'jsonld' => [
                    '@context' => 'https://schema.org',
                    '@type' => 'WebSite',
                    'name' => $site,
                    'url' => Locales::absolute(Locales::url($locale)),
                    'inLanguage' => $locale,
                    'potentialAction' => [
                        '@type' => 'SearchAction',
                        'target' => Locales::absolute(Locales::url($locale, 'search')).'?q={query}',
                        'query-input' => 'required name=query',
                    ],
                ],
            ]),
        ]);
    }
}
