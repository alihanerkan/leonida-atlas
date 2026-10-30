<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Support\Audit;
use App\Support\Locales;
use App\Support\Settings;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class SettingsController extends Controller
{
    public function edit(): Response
    {
        Gate::authorize('settings.manage');

        return Inertia::render('admin/settings', [
            'settings' => Settings::all(),
            'locales' => Locales::codes(),
            'homepageSections' => Settings::DEFAULTS['homepage_sections'],
            'storage' => ['disk' => config('atlas.media.disk'), 'note' => 'Change ATLAS_MEDIA_DISK in the server environment to switch storage; credentials never live in the database.'],
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        Gate::authorize('settings.manage');
        $codes = Locales::codes();
        $data = $request->validate([
            'site_name' => ['required', 'string', 'max:80'],
            'tagline' => ['nullable', 'string', 'max:160'],
            'default_locale' => ['required', Rule::in($codes)],
            'enabled_locales' => ['required', 'array', 'min:1'],
            'enabled_locales.*' => [Rule::in($codes)],
            'social_links' => ['nullable', 'array'],
            'social_links.x' => ['nullable', 'url:https', 'max:255'],
            'social_links.youtube' => ['nullable', 'url:https', 'max:255'],
            'social_links.discord' => ['nullable', 'url:https', 'max:255'],
            'seo_default_description' => ['nullable', 'string', 'max:300'],
            'homepage_sections' => ['nullable', 'array'],
            'homepage_sections.*' => [Rule::in(Settings::DEFAULTS['homepage_sections'])],
            'features' => ['nullable', 'array'],
            'features.submissions' => ['boolean'],
            'features.user_markers' => ['boolean'],
            'features.machine_translation' => ['boolean'],
            'analytics_id' => ['nullable', 'string', 'max:64', 'regex:/^[A-Za-z0-9\-_]+$/'],
            'maintenance_message' => ['nullable', 'string', 'max:300'],
            'disclaimer' => ['nullable', 'string', 'max:2000'],
        ]);
        if (! in_array($data['default_locale'], $data['enabled_locales'], true)) {
            return back()->with('error', 'The default language must be enabled.');
        }
        $before = Settings::all();
        Settings::put($data);
        $changed = collect($data)->filter(fn ($v, $k) => ($before[$k] ?? null) !== $v)->keys();
        Audit::log('settings.updated', null, ['keys' => $changed], 'Site settings');

        return back()->with('success', 'Settings saved.');
    }
}
