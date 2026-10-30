<?php

namespace App\Http\Middleware;

use App\Support\Locales;
use App\Support\Settings;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        $user = $request->user();
        // This middleware runs before the route-level SetLocale, so read the URL locale directly.
        $routeLocale = $request->attributes->get('atlas_locale') ?? $request->route()?->parameter('locale');
        $locale = Locales::isValid($routeLocale) ? $routeLocale : Locales::preferred($request);
        app()->setLocale($locale);
        $settings = Settings::all();

        return array_merge(parent::share($request), [
            'name' => $settings['site_name'],
            'site' => [
                'name' => $settings['site_name'],
                'tagline' => $settings['tagline'],
                'release_date' => config('atlas.release_date'),
                'features' => $settings['features'],
                'social_links' => array_filter($settings['social_links'] ?? []),
                'homepage_sections' => $settings['homepage_sections'],
                'disclaimer' => $settings['disclaimer'],
            ],
            'locale' => $locale,
            'locales' => collect(config('atlas.locales'))
                ->only($settings['enabled_locales'] ?? Locales::codes())
                ->map(fn ($l, $code) => ['code' => $code, 'native' => $l['native'], 'name' => $l['name'], 'intl' => $l['intl']])
                ->values(),
            'sections' => Locales::sectionMap(),
            'sectionCounts' => fn () => \Illuminate\Support\Facades\Cache::remember('atlas.section_counts', 300, function () {
                $counts = \App\Models\Entry::published()->selectRaw('type, count(*) as c')->groupBy('type')->pluck('c', 'type');

                return collect(config('atlas.content_sections'))->map(fn ($types) => (int) collect($types)->sum(fn ($t) => $counts[$t] ?? 0));
            }),
            'auth' => [
                'user' => $user ? [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'avatar' => null,
                    'email_verified_at' => $user->email_verified_at,
                    'permissions' => $user->permissions(),
                    'translator_locales' => $user->translator_locales,
                ] : null,
            ],
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ]);
    }
}
