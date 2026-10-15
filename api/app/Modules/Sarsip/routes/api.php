<?php

use App\Modules\Sarsip\Http\Controllers\ContentController;
use App\Modules\Sarsip\Http\Controllers\DashboardController;
use App\Modules\Sarsip\Http\Controllers\UploadController;
use Illuminate\Support\Facades\Route;

Route::middleware('module.public:sarsip')->group(function (): void {
    Route::get('profile', [ContentController::class, 'profile']);
    Route::get('entries', [ContentController::class, 'entries']);
    Route::get('entries/{id}', [ContentController::class, 'entry']);
    Route::get('entries/{id}/donations', [ContentController::class, 'donations']);
    Route::get('beneficiaries', [ContentController::class, 'beneficiaries']);
    Route::get('transparency', [ContentController::class, 'transparency']);
    Route::get('payment-methods', [ContentController::class, 'paymentMethods']);
    Route::get('files/{filename}', [UploadController::class, 'show']);
});
Route::middleware(['auth:sanctum', 'user.active', 'module.access:sarsip'])->group(function (): void {
    Route::get('admin/entries', [ContentController::class, 'entries'])->defaults('admin', true);
    Route::get('admin/entries/{id}', [ContentController::class, 'entry'])->defaults('admin', true);
    Route::get('admin/beneficiaries', [ContentController::class, 'beneficiaries'])->defaults('admin', true);
    Route::get('admin/beneficiaries/{id}', [ContentController::class, 'beneficiary']);
    Route::get('admin/transactions', [ContentController::class, 'transactions']);
    Route::get('dashboard', DashboardController::class);
    Route::put('profile', [ContentController::class, 'updateProfile']);
    Route::post('entries', [ContentController::class, 'storeEntry']);
    Route::put('entries/{id}', [ContentController::class, 'updateEntry']);
    Route::delete('entries/{id}', [ContentController::class, 'archiveEntry']);
    Route::post('beneficiaries', [ContentController::class, 'storeBeneficiary']);
    Route::put('beneficiaries/{id}', [ContentController::class, 'updateBeneficiary']);
    Route::delete('beneficiaries/{id}', [ContentController::class, 'archiveBeneficiary']);
    Route::post('upload', [UploadController::class, 'store']);
});
