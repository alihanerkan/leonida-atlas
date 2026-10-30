<?php

namespace App\Http\Controllers\Site;

use App\Http\Controllers\Controller;
use App\Models\MapMarker;
use App\Services\EntryPresenter;
use App\Support\Dictionary;
use App\Support\Locales;
use App\Support\Seo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class MapController extends Controller
{
    /** Published markers whose entries are published, shaped for the map renderer. */
    public static function markerPayload(string $locale, ?array $categories = null, ?int $limit = null): array
    {
        $query = MapMarker::query()
            ->where('status', 'published')
            ->whereHas('entry', fn ($q) => $q->published())
            ->with(['entry' => fn ($q) => $q->with(EntryPresenter::CARD_RELATIONS)]);
        if ($categories) {
            $query->whereIn('category', $categories);
        }
        if ($limit) {
            $query->limit($limit);
        }

        return $query->get()->map(function (MapMarker $m) use ($locale) {
            $card = EntryPresenter::card($m->entry, $locale);
            if (! $card) {
                return null;
            }

            return [
                'id' => $m->id,
                'x' => $m->x,
                'y' => $m->y,
                'category' => $m->category,
                'precision' => $m->precision,
                'basis' => $m->approximation_basis,
                'zoom' => $m->zoom,
                'entry' => $card,
            ];
        })->filter()->values()->all();
    }

    public function page(Request $request): Response
    {
        $locale = app()->getLocale();

        return Inertia::render('site/map', [
            'markers' => self::markerPayload($locale),
            'categories' => config('atlas.marker_categories'),
            'focus' => $request->integer('marker') ?: null,
            'meta' => Seo::meta(Dictionary::t('nav.map'), Dictionary::t('meta.map_description'), Locales::url($locale, 'map'), Seo::sectionAlternates('map')),
        ]);
    }

    public function api(Request $request): JsonResponse
    {
        $locale = Locales::isValid($request->query('locale')) ? $request->query('locale') : config('atlas.default_locale');
        app()->setLocale($locale);
        $categories = array_values(array_intersect((array) $request->query('category', []), config('atlas.marker_categories'))) ?: null;

        return response()->json(['data' => self::markerPayload($locale, $categories)]);
    }
}
