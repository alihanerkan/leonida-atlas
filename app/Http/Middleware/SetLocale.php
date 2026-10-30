<?php

namespace App\Http\Middleware;

use App\Support\Locales;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $request->route('locale');
        if (! Locales::isValid($locale)) {
            abort(404);
        }
        app()->setLocale($locale);
        $request->route()->forgetParameter('locale');
        $request->attributes->set('atlas_locale', $locale);

        $user = $request->user();
        if ($user && $user->locale !== $locale) {
            $user->forceFill(['locale' => $locale])->saveQuietly();
        }

        $response = $next($request);

        if ($request->cookie('atlas_locale') !== $locale && method_exists($response, 'withCookie')) {
            $response->withCookie(cookie('atlas_locale', $locale, 60 * 24 * 365, httpOnly: false, sameSite: 'lax'));
        }

        return $response;
    }
}
