<?php

use App\Modules\Lazsip\Http\Controllers\CampaignController;
use App\Modules\Lazsip\Http\Controllers\ContentController;
use App\Modules\Lazsip\Http\Controllers\FinanceController;
use App\Modules\Lazsip\Http\Controllers\HistoryController;
use App\Modules\Lazsip\Http\Controllers\UploadController;
use App\Modules\Lazsip\Http\Controllers\ZakatController;
use Illuminate\Support\Facades\Route;

Route::middleware('module.public:lazsip')->group(function (): void {
    Route::get('gold-price', [ZakatController::class, 'quote']);
    Route::get('zakat/settings', [ZakatController::class, 'settings']);
    Route::post('zakat/calculate', [ZakatController::class, 'maal'])->middleware('throttle:payment-status');
    Route::post('zakat/calculate-fitrah', [ZakatController::class, 'fitrah'])->middleware('throttle:payment-status');
    Route::post('zakat', [ZakatController::class, 'legacyStore'])->middleware('throttle:checkout');
    Route::post('transactions/status', [HistoryController::class, 'status'])->middleware('throttle:checkout');
    Route::post('transactions/history', [HistoryController::class, 'publicHistory'])->middleware('throttle:checkout');
    Route::post('donations', [FinanceController::class, 'legacyDonation'])->middleware('throttle:checkout');
    Route::get('totals', [FinanceController::class, 'totals']);
    Route::get('campaigns', [CampaignController::class, 'index']);
    Route::get('campaigns/{id}', [CampaignController::class, 'show']);
    Route::get('site-content/{key}', [ContentController::class, 'siteContent']);
    Route::get('verifier-filters', [ContentController::class, 'verifierFilters']);
    Route::get('checkout-methods', [ContentController::class, 'checkoutMethods']);
    Route::get('files/{filename}', [UploadController::class, 'show']);
    Route::post('programs/{id}/apply', [ContentController::class, 'apply'])->middleware('throttle:checkout');
    foreach (['news', 'programs', 'partners', 'activities', 'beneficiaries', 'payment-fees'] as $resource) {
        Route::get($resource, [ContentController::class, 'index'])->defaults('resource', $resource);
        Route::get($resource.'/{id}', [ContentController::class, 'show'])->defaults('resource', $resource);
    }
});
Route::middleware(['auth:sanctum', 'user.active', 'module.access:lazsip'])->group(function (): void {
    Route::get('donors', [HistoryController::class, 'donors']);
    Route::get('donors/{id}', [HistoryController::class, 'donor']);
    Route::get('donors/{id}/history', [HistoryController::class, 'donorHistory']);
    Route::get('dashboard', [FinanceController::class, 'dashboard']);
    foreach (['donations', 'zakat'] as $source) {
        Route::get('admin/'.$source.'/legacy', [FinanceController::class, 'legacyPayments'])->defaults('source', $source);
        Route::get('admin/'.$source.'/payments', [FinanceController::class, 'paymentRows'])->defaults('source', $source);
        Route::put($source.'/{id}/simulate-payment', [FinanceController::class, 'simulateLegacy'])->defaults('source', $source);
    }
    Route::get('campaigns/{id}/history', [CampaignController::class, 'history']);
    Route::post('campaigns', [CampaignController::class, 'store']);
    Route::put('campaigns/{id}', [CampaignController::class, 'update']);
    Route::delete('campaigns/{id}', [CampaignController::class, 'destroy']);
    Route::put('campaigns/{id}/status', [CampaignController::class, 'status']);
    Route::post('campaigns/{id}/adjust', [CampaignController::class, 'adjust']);
    Route::post('campaigns/{id}/offline-donation', [CampaignController::class, 'offline']);
    Route::get('applicants', [ContentController::class, 'applicants']);
    Route::put('applicants/{id}/status', [ContentController::class, 'applicantStatus']);
    Route::put('programs/{id}/registration', [ContentController::class, 'registration']);
    Route::put('site-content/{key}', [ContentController::class, 'updateSiteContent']);
    Route::post('upload', [UploadController::class, 'store']);
    foreach (['news', 'programs', 'partners', 'activities', 'beneficiaries', 'payment-fees'] as $resource) {
        Route::get('admin/'.$resource, [ContentController::class, 'index'])->defaults('resource', $resource)->defaults('admin', true);
        Route::get('admin/'.$resource.'/{id}', [ContentController::class, 'show'])->defaults('resource', $resource)->defaults('admin', true);
        Route::post($resource, [ContentController::class, 'store'])->defaults('resource', $resource)->defaults('admin', true);
        Route::put($resource.'/{id}', [ContentController::class, 'update'])->defaults('resource', $resource)->defaults('admin', true);
        Route::delete($resource.'/{id}', [ContentController::class, 'destroy'])->defaults('resource', $resource)->defaults('admin', true);
    }
});
