<?php

use App\Modules\Bantuan\Http\Controllers\BantuanController as C;
use App\Modules\Bantuan\Http\Controllers\DocumentController;
use App\Modules\Bantuan\Http\Controllers\SantunanController;
use App\Modules\Bantuan\Http\Controllers\StaffController as S;
use Illuminate\Support\Facades\Route;

Route::get('viewer', [C::class, 'viewer']);
Route::put('active-role', [C::class, 'switchRole']);
Route::get('dashboard', [C::class, 'dashboard']);
Route::get('export', [C::class, 'export']);
Route::get('applications', [C::class, 'index']);
Route::post('applications', [C::class, 'store']);
Route::post('duplicate-check', [C::class, 'duplicate']);
Route::post('applicants/search', [C::class, 'searchApplicants'])->middleware('throttle:60,1');
Route::post('batch', [C::class, 'batch']);
Route::get('applications/{id}', [C::class, 'show']);
Route::put('applications/{id}', [C::class, 'update']);
Route::delete('applications/{id}', [C::class, 'destroy']);
Route::post('applications/{id}/actions/{action}', [C::class, 'action']);
Route::post('applications/{id}/documents', [C::class, 'document'])->middleware('throttle:60,1');
Route::get('documents/{id}', [C::class, 'download']);
Route::delete('documents/{id}', [DocumentController::class, 'destroy']);
Route::get('notifications', [C::class, 'notifications']);
Route::put('notifications/{id}/read', [C::class, 'readNotification']);
Route::get('audit', [C::class, 'audit']);
Route::match(['GET', 'PUT'], 'settings', [C::class, 'master']);
Route::get('staff', [S::class, 'index']);
Route::post('staff', [S::class, 'store']);
Route::put('staff/{id}', [S::class, 'update']);
Route::delete('staff/{id}', [S::class, 'destroy']);
Route::get('santunan', [SantunanController::class, 'index']);
Route::post('santunan', [SantunanController::class, 'store']);
Route::post('santunan/{id}/transferred', [SantunanController::class, 'transferred']);
Route::post('santunan/{id}/documents', [SantunanController::class, 'document'])->middleware('throttle:60,1');
Route::post('santunan/{id}/complete', [SantunanController::class, 'complete']);
Route::get('santunan-documents/{documentId}', [SantunanController::class, 'download']);
