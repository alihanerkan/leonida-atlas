<?php

namespace App\Support;

use Illuminate\Support\Arr;

/** Reads the same JSON UI dictionaries the React app uses, so server-rendered meta matches the UI. */
class Dictionary
{
    private static array $cache = [];

    public static function load(string $locale): array
    {
        if (! isset(self::$cache[$locale])) {
            $file = resource_path("locales/$locale.json");
            self::$cache[$locale] = is_file($file) ? (json_decode(file_get_contents($file), true) ?? []) : [];
        }

        return self::$cache[$locale];
    }

    public static function t(string $key, ?string $locale = null, array $replace = []): string
    {
        $locale ??= app()->getLocale();
        $value = Arr::get(self::load($locale), $key) ?? Arr::get(self::load('en'), $key) ?? $key;
        foreach ($replace as $k => $v) {
            $value = str_replace('{{'.$k.'}}', (string) $v, $value);
        }

        return is_string($value) ? $value : $key;
    }
}
