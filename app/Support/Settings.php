<?php

namespace App\Support;

use App\Models\Setting;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;
use Throwable;

class Settings
{
    public const DEFAULTS = [
        'site_name' => 'Leonida Atlas',
        'tagline' => null,
        'default_locale' => 'en',
        'enabled_locales' => ['en', 'tr', 'es', 'zh-CN', 'it', 'fr', 'ru'],
        'social_links' => ['x' => null, 'youtube' => null, 'discord' => null],
        'seo_default_description' => null,
        'homepage_sections' => ['world', 'characters', 'vehicles', 'mysteries', 'map', 'guides', 'updates'],
        'features' => ['submissions' => true, 'user_markers' => true, 'machine_translation' => false],
        'analytics_id' => null,
        'maintenance_message' => null,
        'disclaimer' => null,
        'home_media' => [],
    ];

    public static function all(): array
    {
        return Cache::rememberForever('atlas.settings', function () {
            try {
                if (! Schema::hasTable('settings')) {
                    return self::DEFAULTS;
                }
                $stored = Setting::query()->pluck('value', 'key')->all();
            } catch (Throwable) {
                return self::DEFAULTS;
            }

            return array_merge(self::DEFAULTS, array_filter($stored, fn ($v) => $v !== null));
        });
    }

    public static function get(string $key, mixed $default = null): mixed
    {
        return self::all()[$key] ?? $default;
    }

    public static function put(array $values): void
    {
        foreach ($values as $key => $value) {
            Setting::updateOrCreate(['key' => $key], ['value' => $value]);
        }
        Cache::forget('atlas.settings');
    }

    public static function siteName(): string
    {
        return self::get('site_name') ?: 'Leonida Atlas';
    }
}
