<?php

use App\Http\Controllers\Api\MeController;
use App\Http\Controllers\Api\PublicApiController;
use App\Http\Controllers\Site\HomeController;
use App\Http\Controllers\Site\MapController;
use App\Http\Controllers\Site\SectionController;
use App\Http\Controllers\Site\SitemapController;
use App\Http\Controllers\Site\SubmissionController;
use App\Support\Locales;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', fn (Request $request) => redirect(Locales::url(Locales::preferred($request)), 302))->name('home');

Route::get('dashboard', function (Request $request) {
    $user = $request->user();

    return $user->hasPermission('admin.access')
        ? redirect()->route('admin.dashboard')
        : redirect(Locales::url($user->locale ?: Locales::preferred($request), 'tracker'));
})->middleware('auth')->name('dashboard');

Route::get('robots.txt', fn () => response(
    "User-agent: *\nDisallow: /admin\nDisallow: /api/\nDisallow: /login\nDisallow: /register\n\nSitemap: ".Locales::absolute('/sitemap.xml')."\n",
    200,
    ['Content-Type' => 'text/plain'],
));
Route::get('sitemap.xml', [SitemapController::class, 'index']);
Route::get('sitemaps/{locale}.xml', [SitemapController::class, 'locale']);

Route::prefix('api/v1')->name('api.')->group(function () {
    Route::middleware('throttle:search')->get('search', [PublicApiController::class, 'search'])->name('search');
    Route::middleware('throttle:api')->group(function () {
        Route::get('entries', [PublicApiController::class, 'entries'])->name('entries');
        Route::get('entries/{id}', [PublicApiController::class, 'entry'])->whereNumber('id')->name('entry');
        Route::get('map/markers', [MapController::class, 'api'])->name('map');
    });

    Route::middleware(['auth', 'throttle:writes'])->prefix('me')->name('me.')->group(function () {
        Route::get('state', [MeController::class, 'state'])->name('state');
        Route::post('favorites/{entry}', [MeController::class, 'toggleFavorite'])->whereNumber('entry')->name('favorite');
        Route::post('progress/{entry}', [MeController::class, 'toggleProgress'])->whereNumber('entry')->name('progress');
        Route::post('import', [MeController::class, 'import'])->name('import');
        Route::post('markers', [MeController::class, 'storeMarker'])->name('markers.store');
        Route::delete('markers/{marker}', [MeController::class, 'destroyMarker'])->whereNumber('marker')->name('markers.destroy');
        Route::post('lists', [MeController::class, 'storeList'])->name('lists.store');
        Route::post('lists/{list}/entries/{entry}', [MeController::class, 'toggleListItem'])->whereNumber(['list', 'entry'])->name('lists.toggle');
        Route::delete('lists/{list}', [MeController::class, 'destroyList'])->whereNumber('list')->name('lists.destroy');
    });
});

Route::post('submissions', [SubmissionController::class, 'store'])->middleware(['auth', 'throttle:submissions'])->name('submissions.store');

require __DIR__.'/admin.php';
require __DIR__.'/settings.php';
require __DIR__.'/auth.php';

// Localized public site. Kept last so fixed paths above win.
Route::prefix('{locale}')
    ->where(['locale' => Locales::routePattern()])
    ->middleware('locale')
    ->name('site.')
    ->group(function () {
        Route::get('/', HomeController::class)->name('home');
        Route::get('{segment}', [SectionController::class, 'index'])->name('section');
        Route::get('{segment}/{slug}', [SectionController::class, 'show'])->name('entry');
    });
