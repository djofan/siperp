<?php

use Illuminate\Support\Facades\Route;
use Tests\Fixtures\Rest\ExampleStore;
use Tests\Fixtures\Rest\PaymentAttemptController;

app()->singleton(ExampleStore::class);
Route::prefix('api/v1/examples')->middleware(['api', 'auth:sanctum'])->group(function (): void {
    Route::apiResource('payment-attempts', PaymentAttemptController::class)->names('examples.payment-attempts');
});
