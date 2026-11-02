<?php

use App\Modules\Bantuan\Http\Controllers\MobileLoginController;
use Illuminate\Support\Facades\Route;

Route::post('login', MobileLoginController::class)->middleware('throttle:login');
