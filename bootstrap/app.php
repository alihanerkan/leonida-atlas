<?php

use App\Http\Middleware\HandleInertiaRequests;
use App\Http\Middleware\SecurityHeaders;
use App\Http\Middleware\SetLocale;
use App\Support\Dictionary;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // Render (and most hosts) terminate TLS at a proxy in front of the app.
        $middleware->trustProxies(at: '*');
        $middleware->encryptCookies(except: ['atlas_locale']);
        $middleware->web(append: [
            HandleInertiaRequests::class,
            AddLinkHeadersForPreloadedAssets::class,
            SecurityHeaders::class,
        ]);
        $middleware->alias(['locale' => SetLocale::class]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        $exceptions->shouldRenderJsonWhen(fn ($request) => $request->is('api/*') || $request->expectsJson());

        // Branded, localized error pages. Local 500s keep Laravel's debug screen.
        $exceptions->respond(function (Response $response, Throwable $e, Request $request) {
            $status = $response->getStatusCode();
            if (! in_array($status, [403, 404, 419, 429, 500, 503], true) || $request->expectsJson() || $request->is('api/*')) {
                return $response;
            }
            if ($status >= 500 && app()->hasDebugModeEnabled()) {
                return $response;
            }
            try {
                Inertia::share(app(HandleInertiaRequests::class)->share($request));
                $key = $status === 404 ? '404' : ($status === 403 ? '403' : '500');

                return Inertia::render('site/error', [
                    'status' => $status,
                    'meta' => ['title' => Dictionary::t("errors.{$key}_title"), 'noindex' => true],
                ])->toResponse($request)->setStatusCode($status);
            } catch (Throwable) {
                return $response;
            }
        });
    })->create();
