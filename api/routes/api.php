<?php

use App\Modules\Core\Http\Controllers\HealthController;
use App\Modules\Core\Http\Controllers\LoginController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);
Route::post('/auth/login', LoginController::class)->middleware('throttle:login');
