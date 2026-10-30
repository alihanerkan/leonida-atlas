<?php

namespace App\Http\Controllers\Site;

use App\Http\Controllers\Controller;
use App\Models\EntryTranslation;
use App\Support\Locales;
use Illuminate\Http\Response;

class SitemapController extends Controller
{
    public function index(): Response
    {
        $xml = '<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';
        foreach (Locales::codes() as $code) {
            $xml .= '<sitemap><loc>'.e(Locales::absolute("/sitemaps/$code.xml")).'</loc></sitemap>';
        }
        $xml .= '</sitemapindex>';

        return response($xml, 200, ['Content-Type' => 'application/xml']);
    }

    /** One sitemap per locale; only pages with a published translation in that locale are listed. */
    public function locale(string $locale): Response
    {
        abort_unless(Locales::isValid($locale), 404);
        $urls = [];
        $static = ['', 'map', 'about', 'sources', 'compare', ...array_keys(config('atlas.content_sections'))];
        foreach ($static as $section) {
            $alts = [];
            foreach (Locales::codes() as $code) {
                $alts[$code] = Locales::url($code, $section ?: null);
            }
            $urls[] = ['loc' => Locales::url($locale, $section ?: null), 'alts' => $alts, 'lastmod' => null];
        }

        $translations = EntryTranslation::query()
            ->where('locale', $locale)->where('status', 'published')
            ->whereHas('entry', fn ($q) => $q->published())
            ->with(['entry.translations' => fn ($q) => $q->where('status', 'published')])
            ->get();
        foreach ($translations as $t) {
            $section = config("atlas.types.{$t->entry->type}.section");
            $alts = [];
            foreach ($t->entry->translations as $alt) {
                $alts[$alt->locale] = Locales::url($alt->locale, $section, $alt->slug);
            }
            $urls[] = ['loc' => Locales::url($locale, $section, $t->slug), 'alts' => $alts, 'lastmod' => $t->updated_at?->toDateString()];
        }

        $xml = '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">';
        foreach ($urls as $u) {
            $xml .= '<url><loc>'.e(Locales::absolute($u['loc'])).'</loc>';
            if ($u['lastmod']) {
                $xml .= '<lastmod>'.$u['lastmod'].'</lastmod>';
            }
            foreach ($u['alts'] as $code => $path) {
                $xml .= '<xhtml:link rel="alternate" hreflang="'.e($code).'" href="'.e(Locales::absolute($path)).'"/>';
            }
            $xml .= '</url>';
        }
        $xml .= '</urlset>';

        return response($xml, 200, ['Content-Type' => 'application/xml']);
    }
}
