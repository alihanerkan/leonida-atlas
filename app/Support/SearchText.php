<?php

namespace App\Support;

use Illuminate\Support\Str;

/** Portable accent- and case-insensitive search normalization (works on SQLite and PostgreSQL). */
class SearchText
{
    public static function normalize(?string $text): string
    {
        $lower = mb_strtolower(trim((string) $text));
        $lower = preg_replace('/\s+/u', ' ', $lower);

        return $lower;
    }

    public static function fold(?string $text): string
    {
        return Str::ascii(self::normalize($text));
    }

    public static function build(array $parts): string
    {
        $flat = self::normalize(implode(' ', array_filter(array_map(fn ($p) => is_array($p) ? implode(' ', self::flatten($p)) : (string) $p, $parts))));
        $folded = Str::ascii($flat);

        return $folded === $flat ? $flat : $flat.' | '.$folded;
    }

    private static function flatten(array $value): array
    {
        $out = [];
        array_walk_recursive($value, function ($v) use (&$out) {
            if (is_string($v)) {
                $out[] = $v;
            }
        });

        return $out;
    }
}
