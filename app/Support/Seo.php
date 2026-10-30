<?php

namespace App\Support;

use Illuminate\Support\Str;

class Seo
{
    /**
     * @param  array<string, string>  $alternates  locale => relative path
     */
    public static function meta(string $title, ?string $description, string $path, array $alternates = [], array $extra = []): array
    {
        $site = Settings::siteName();
        $locale = app()->getLocale();
        $abs = array_map(fn ($p) => Locales::absolute($p), $alternates);
        if ($abs && isset($abs[config('atlas.default_locale')])) {
            $abs['x-default'] = $abs[config('atlas.default_locale')];
        }

        return array_merge([
            'title' => $title === $site ? $site : "$title — $site",
            'description' => Str::limit(strip_tags((string) ($description ?: Dictionary::t('meta.default_description'))), 300, '…'),
            'canonical' => Locales::absolute($extra['canonical_path'] ?? $path),
            'alternates' => $abs,
            'locale' => $locale,
            'og_locale' => config("atlas.locales.$locale.og"),
            'og_type' => 'website',
            'image' => Locales::absolute('/og-default.png'),
            'site_name' => $site,
            'noindex' => false,
            'jsonld' => null,
        ], collect($extra)->except('canonical_path')->all());
    }

    /** Alternates for a static section: every locale has the page. */
    public static function sectionAlternates(?string $section, array $query = []): array
    {
        $out = [];
        foreach (Locales::codes() as $code) {
            $out[$code] = Locales::url($code, $section, null, $query);
        }

        return $out;
    }
}
