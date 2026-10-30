<?php

namespace App\Support;

use Illuminate\Http\Request;

class Locales
{
    /** @return list<string> */
    public static function codes(): array
    {
        return array_keys(config('atlas.locales'));
    }

    public static function isValid(?string $code): bool
    {
        return $code !== null && array_key_exists($code, config('atlas.locales'));
    }

    public static function default(): string
    {
        return Settings::get('default_locale', config('atlas.default_locale'));
    }

    public static function routePattern(): string
    {
        return implode('|', array_map(fn ($c) => preg_quote($c, '/'), self::codes()));
    }

    public static function segment(string $section, string $locale): string
    {
        return config("atlas.sections.$section.$locale") ?? config("atlas.sections.$section.en") ?? $section;
    }

    public static function sectionFromSegment(string $segment, string $locale): ?string
    {
        foreach (config('atlas.sections') as $section => $segments) {
            if (($segments[$locale] ?? null) === $segment) {
                return $section;
            }
        }

        return null;
    }

    public static function url(string $locale, ?string $section = null, ?string $slug = null, array $query = []): string
    {
        $path = '/'.$locale;
        if ($section) {
            $path .= '/'.self::segment($section, $locale);
        }
        if ($slug) {
            $path .= '/'.rawurlencode($slug);
        }
        if ($query) {
            $path .= '?'.http_build_query($query);
        }

        return $path;
    }

    public static function absolute(string $path): string
    {
        return rtrim(config('app.url'), '/').$path;
    }

    /** Preferred locale from cookie, signed-in user or Accept-Language header. */
    public static function preferred(Request $request): string
    {
        $candidates = [$request->cookie('atlas_locale'), $request->user()?->locale];
        foreach ($candidates as $c) {
            if (self::isValid($c)) {
                return $c;
            }
        }
        foreach ($request->getLanguages() as $lang) {
            $lang = str_replace('_', '-', $lang);
            if (str_starts_with(strtolower($lang), 'zh')) {
                return 'zh-CN';
            }
            $short = strtolower(substr($lang, 0, 2));
            if (self::isValid($short)) {
                return $short;
            }
        }

        return self::default();
    }

    /** Section map for the frontend: section => [locale => segment]. */
    public static function sectionMap(): array
    {
        return config('atlas.sections');
    }
}
