<?php

use App\Modules\Bantuan\Http\Controllers\BantuanController as C;
use App\Modules\Bantuan\Http\Controllers\StaffController as S;
use Illuminate\Support\Facades\Route;

Route::get('viewer', [C::class, 'viewer']);
Route::get('dashboard', [C::class, 'dashboard']);
Route::get('export', [C::class, 'export']);
Route::get('applications', [C::class, 'index']);
Route::post('applications', [C::class, 'store']);
Route::post('duplicate-check', [C::class, 'duplicate']);
Route::post('batch', [C::class, 'batch']);
Route::get('applications/{id}', [C::class, 'show']);
Route::put('applications/{id}', [C::class, 'update']);
Route::post('applications/{id}/actions/{action}', [C::class, 'action']);
Route::post('applications/{id}/documents', [C::class, 'document'])->middleware('throttle:60,1');
Route::get('documents/{id}', [C::class, 'download']);
Route::delete('documents/{id}', [\App\Modules\Bantuan\Http\Controllers\DocumentController::class, 'destroy']);
Route::get('notifications', [C::class, 'notifications']);
Route::put('notifications/{id}/read', [C::class, 'readNotification']);
Route::get('audit', [C::class, 'audit']);
Route::match(['GET', 'PUT'], 'settings', [C::class, 'master']);
Route::get('staff', [S::class, 'index']);
Route::post('staff', [S::class, 'store']);
Route::put('staff/{id}', [S::class, 'update']);
