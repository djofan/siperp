<?php

use App\Modules\Payment\Http\Controllers\DestinationAccountController;
use App\Modules\Payment\Http\Controllers\PaymentController;
use Illuminate\Support\Facades\Route;

Route::post('checkout', [PaymentController::class, 'checkout'])->middleware('throttle:checkout');
Route::get('status/{id}', [PaymentController::class, 'status'])->middleware('throttle:payment-status');
Route::post('gateway-session/{id}', [PaymentController::class, 'session'])->middleware('throttle:checkout');
Route::post('gateway-status/{id}', [PaymentController::class, 'sync'])->middleware('throttle:payment-status');
Route::post('webhook/ipaymu', [PaymentController::class, 'webhook']);
Route::middleware(['auth:sanctum', 'user.active'])->group(function (): void {
    Route::get('transactions', [PaymentController::class, 'index']);
    Route::get('charts', [PaymentController::class, 'charts']);
    Route::put('simulate-payment/{id}', [PaymentController::class, 'simulate']);
    Route::middleware('superadmin')->group(function (): void {
        Route::get('destination-accounts', [DestinationAccountController::class, 'index']);
        Route::post('destination-accounts', [DestinationAccountController::class, 'store']);
        Route::delete('destination-accounts/{id}', [DestinationAccountController::class, 'destroy']);
    });
});
