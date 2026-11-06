<?php

use App\Modules\Sip\Http\Controllers\ContentController;
use App\Modules\Sip\Http\Controllers\DashboardController;
use App\Modules\Sip\Http\Controllers\SiteContentController;
use App\Modules\Sip\Http\Controllers\UploadController;
use Illuminate\Support\Facades\Route;

Route::middleware('module.public:sip')->group(function (): void {
    Route::get('site-content/{key}', [SiteContentController::class, 'show']);
    Route::get('files/{filename}', [UploadController::class, 'show']);
    Route::get('program-bantuan/by-slug/{slug}', [ContentController::class, 'show'])->defaults('resource', 'program-bantuan');
    foreach (['news', 'program-bantuan', 'penyaluran-bantuan', 'laporan'] as $resource) {
        Route::get($resource, [ContentController::class, 'index'])->defaults('resource', $resource);
        Route::get($resource.'/{id}', [ContentController::class, 'show'])->defaults('resource', $resource);
    }
});
Route::middleware(['auth:sanctum', 'user.active', 'module.access:sip'])->group(function (): void {
    Route::get('dashboard', DashboardController::class);
    Route::put('site-content/{key}', [SiteContentController::class, 'update']);
    Route::post('upload', [UploadController::class, 'store']);
    foreach (['news', 'program-bantuan', 'penyaluran-bantuan', 'laporan'] as $resource) {
        Route::get('admin/'.$resource, [ContentController::class, 'index'])->defaults('resource', $resource)->defaults('admin', true);
        Route::get('admin/'.$resource.'/{id}', [ContentController::class, 'show'])->defaults('resource', $resource)->defaults('admin', true);
        Route::post($resource, [ContentController::class, 'store'])->defaults('resource', $resource)->defaults('admin', true);
        Route::put($resource.'/{id}', [ContentController::class, 'update'])->defaults('resource', $resource)->defaults('admin', true);
        Route::delete($resource.'/{id}', [ContentController::class, 'destroy'])->defaults('resource', $resource)->defaults('admin', true);
    }
});
