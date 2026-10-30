@php
    $props = $page['props'] ?? [];
    $meta = $props['meta'] ?? [];
    $locale = $props['locale'] ?? app()->getLocale();
    $siteName = $props['site']['name'] ?? config('app.name', 'Leonida Atlas');
    $title = $meta['title'] ?? $siteName;
@endphp
<!DOCTYPE html>
<html lang="{{ $locale }}" class="dark" style="color-scheme: dark">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
        <meta name="theme-color" content="#07060b">
        <script nonce="{{ Vite::cspNonce() }}">
            (function () {
                try {
                    var a = localStorage.getItem('appearance') || 'dark';
                    var dark = a === 'dark' || (a === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                    if (!dark) { document.documentElement.classList.remove('dark'); document.documentElement.style.colorScheme = 'light'; }
                } catch (e) {}
            })();
        </script>

        <title inertia>{{ $title }}</title>
        @if (!empty($meta['description']))
            <meta inertia="description" name="description" content="{{ $meta['description'] }}">
        @endif
        @if (!empty($meta['noindex']))
            <meta inertia="robots" name="robots" content="noindex, follow">
        @endif
        @if (!empty($meta['canonical']))
            <link inertia="canonical" rel="canonical" href="{{ $meta['canonical'] }}">
        @endif
        @foreach (($meta['alternates'] ?? []) as $hreflang => $href)
            <link inertia="alt-{{ $hreflang }}" rel="alternate" hreflang="{{ $hreflang }}" href="{{ $href }}">
        @endforeach
        @if (!empty($meta['canonical']))
            <meta inertia="og:title" property="og:title" content="{{ $title }}">
            <meta inertia="og:description" property="og:description" content="{{ $meta['description'] ?? '' }}">
            <meta inertia="og:url" property="og:url" content="{{ $meta['canonical'] }}">
            <meta inertia="og:type" property="og:type" content="{{ $meta['og_type'] ?? 'website' }}">
            <meta inertia="og:site_name" property="og:site_name" content="{{ $siteName }}">
            <meta inertia="og:locale" property="og:locale" content="{{ $meta['og_locale'] ?? 'en_US' }}">
            <meta inertia="og:image" property="og:image" content="{{ $meta['image'] ?? '' }}">
            <meta inertia="twitter:card" name="twitter:card" content="summary_large_image">
        @endif
        @if (!empty($meta['jsonld']))
            <script type="application/ld+json">{!! json_encode($meta['jsonld'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP) !!}</script>
        @endif
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">

        @routes(nonce: Vite::cspNonce())
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
        <noscript>
            <div style="padding:2rem;font-family:system-ui;color:#f5efe6;background:#07060b">
                <h1>{{ $title }}</h1>
                <p>{{ $meta['description'] ?? '' }}</p>
            </div>
        </noscript>
    </body>
</html>
