<?php

use App\Http\Controllers\Admin\AuditController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\EntryController;
use App\Http\Controllers\Admin\ImportController;
use App\Http\Controllers\Admin\MapEditorController;
use App\Http\Controllers\Admin\MediaController;
use App\Http\Controllers\Admin\SettingsController;
use App\Http\Controllers\Admin\SubmissionReviewController;
use App\Http\Controllers\Admin\TranslationController;
use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;

// Each controller action re-checks its specific permission via Gate::authorize.
Route::prefix('admin')->name('admin.')->middleware(['auth', 'can:admin.access', 'throttle:writes'])->group(function () {
    Route::get('/', DashboardController::class)->name('dashboard');

    Route::get('entries', [EntryController::class, 'index'])->name('entries.index');
    Route::get('entries/create', [EntryController::class, 'create'])->name('entries.create');
    Route::post('entries', [EntryController::class, 'store'])->name('entries.store');
    Route::post('entries/bulk', [EntryController::class, 'bulk'])->name('entries.bulk');
    Route::get('entries/duplicates', [EntryController::class, 'duplicates'])->name('entries.duplicates');
    Route::get('entries/lookup', [EntryController::class, 'lookup'])->name('entries.lookup');
    Route::get('entries/{id}', [EntryController::class, 'edit'])->whereNumber('id')->name('entries.edit');
    Route::put('entries/{id}', [EntryController::class, 'update'])->whereNumber('id')->name('entries.update');
    Route::delete('entries/{id}', [EntryController::class, 'destroy'])->whereNumber('id')->name('entries.destroy');
    Route::post('entries/{id}/restore', [EntryController::class, 'restore'])->whereNumber('id')->name('entries.restore');
    Route::get('entries/{id}/preview', [EntryController::class, 'preview'])->whereNumber('id')->name('entries.preview');
    Route::post('entries/{id}/relations', [EntryController::class, 'storeRelation'])->whereNumber('id')->name('entries.relations.store');
    Route::delete('entries/{id}/relations/{relation}', [EntryController::class, 'destroyRelation'])->whereNumber(['id', 'relation'])->name('entries.relations.destroy');
    Route::post('entries/{id}/sources', [EntryController::class, 'attachSource'])->whereNumber('id')->name('entries.sources.store');
    Route::delete('entries/{id}/sources/{source}', [EntryController::class, 'detachSource'])->whereNumber(['id', 'source'])->name('entries.sources.destroy');

    Route::get('translations', [TranslationController::class, 'index'])->name('translations.index');
    Route::get('translations/{id}/{locale}', [TranslationController::class, 'edit'])->whereNumber('id')->name('translations.edit');
    Route::put('translations/{id}/{locale}', [TranslationController::class, 'update'])->whereNumber('id')->name('translations.update');
    Route::post('translations/{id}/{locale}/copy', [TranslationController::class, 'copyFromSource'])->whereNumber('id')->name('translations.copy');
    Route::delete('translations/{id}/{locale}', [TranslationController::class, 'destroy'])->whereNumber('id')->name('translations.destroy');

    Route::get('media', [MediaController::class, 'index'])->name('media.index');
    Route::post('media', [MediaController::class, 'store'])->middleware('throttle:uploads')->name('media.store');
    Route::put('media/{id}', [MediaController::class, 'update'])->whereNumber('id')->name('media.update');
    Route::delete('media/{id}', [MediaController::class, 'destroy'])->whereNumber('id')->name('media.destroy');

    Route::get('map', [MapEditorController::class, 'index'])->name('map.index');
    Route::post('map/markers', [MapEditorController::class, 'store'])->name('map.store');
    Route::put('map/markers/{id}', [MapEditorController::class, 'update'])->whereNumber('id')->name('map.update');
    Route::delete('map/markers/{id}', [MapEditorController::class, 'destroy'])->whereNumber('id')->name('map.destroy');
    Route::get('map/export', [MapEditorController::class, 'export'])->name('map.export');
    Route::post('map/import', [MapEditorController::class, 'import'])->name('map.import');

    Route::get('submissions', [SubmissionReviewController::class, 'index'])->name('submissions.index');
    Route::post('submissions/{id}/review', [SubmissionReviewController::class, 'review'])->whereNumber('id')->name('submissions.review');

    Route::get('import', [ImportController::class, 'show'])->name('import.show');
    Route::post('import', [ImportController::class, 'store'])->name('import.store');

    Route::get('users', [UserController::class, 'index'])->name('users.index');
    Route::put('users/{id}', [UserController::class, 'update'])->whereNumber('id')->name('users.update');

    Route::get('settings', [SettingsController::class, 'edit'])->name('settings.edit');
    Route::put('settings', [SettingsController::class, 'update'])->name('settings.update');

    Route::get('audit', [AuditController::class, 'index'])->name('audit.index');
});
