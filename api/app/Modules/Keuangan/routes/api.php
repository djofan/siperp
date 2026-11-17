<?php

use App\Modules\Keuangan\Http\Controllers\OverviewController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'user.active', 'module.access:keuangan'])->group(function (): void {
    Route::get('overview', OverviewController::class);
});
