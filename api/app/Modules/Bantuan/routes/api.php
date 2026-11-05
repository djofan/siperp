<?php

use App\Modules\Bantuan\Http\Controllers\BantuanController as C;
use App\Modules\Bantuan\Http\Controllers\DocumentController;
use App\Modules\Bantuan\Http\Controllers\SantunanController;
use App\Modules\Bantuan\Http\Controllers\StaffController as S;
use Illuminate\Support\Facades\Route;
use App\Modules\Bantuan\Http\Controllers\FundingRequestController;
use App\Modules\Bantuan\Http\Controllers\MustahiqController;

Route::get('mustahiq', [MustahiqController::class, 'index']);
Route::get('mustahiq/{id}', [MustahiqController::class, 'show']);
Route::put('mustahiq/{id}', [MustahiqController::class, 'update']);

Route::get('funding-requests/ready', [FundingRequestController::class, 'ready']);
Route::get('funding-requests', [FundingRequestController::class, 'index']);
Route::post('funding-requests', [FundingRequestController::class, 'store']);
Route::get('funding-requests/{id}', [FundingRequestController::class, 'show']);
Route::post('funding-requests/{id}/decision', [FundingRequestController::class, 'decide']);

Route::get('viewer', [C::class, 'viewer']);
Route::put('active-role', [C::class, 'switchRole']);
Route::get('dashboard', [C::class, 'dashboard']);
Route::get('export', [C::class, 'export']);
Route::get('applications', [C::class, 'index']);
Route::post('applications', [C::class, 'store']);
Route::post('duplicate-check', [C::class, 'duplicate']);
Route::post('applicants/search', [C::class, 'searchApplicants'])->middleware('throttle:60,1');
Route::post('batch', [C::class, 'batch']);
Route::post('application-reminders', [\App\Modules\Bantuan\Http\Controllers\ApplicationReminderController::class, 'bulk'])->middleware('throttle:10,1');
Route::get('applications/{id}', [C::class, 'show']);
Route::post('applications/{id}/locations', [\App\Modules\Bantuan\Http\Controllers\SurveyLocationController::class, 'search'])->middleware('throttle:20,1');
Route::post('applications/{id}/route', [\App\Modules\Bantuan\Http\Controllers\SurveyLocationController::class, 'route'])->middleware('throttle:20,1');
Route::put('applications/{id}', [C::class, 'update']);
Route::delete('applications/{id}', [C::class, 'destroy']);
Route::post('applications/{id}/actions/{action}', [C::class, 'action']);
Route::post('applications/{id}/documents', [C::class, 'document'])->middleware('throttle:60,1');
Route::get('documents/{id}', [C::class, 'download']);
Route::delete('documents/{id}', [DocumentController::class, 'destroy']);
Route::get('notifications', [C::class, 'notifications']);
Route::put('notifications/read-all', [C::class, 'readAllNotifications']);
Route::put('notifications/{id}/read', [C::class, 'readNotification']);
Route::get('audit', [C::class, 'audit']);
Route::match(['GET', 'PUT'], 'settings', [C::class, 'master']);
Route::get('staff', [S::class, 'index']);
Route::post('staff', [S::class, 'store']);
Route::put('staff/{id}', [S::class, 'update']);
Route::delete('staff/{id}', [S::class, 'destroy']);
Route::get('santunan', [SantunanController::class, 'index']);
Route::post('santunan/periods', [SantunanController::class, 'nextPeriod']);
Route::post('santunan', [SantunanController::class, 'store']);
Route::post('santunan/{id}/transferred', [SantunanController::class, 'transferred']);
Route::post('santunan/{id}/documents', [SantunanController::class, 'document'])->middleware('throttle:60,1');
Route::post('santunan/{id}/complete', [SantunanController::class, 'complete']);
Route::get('santunan-documents/{documentId}', [SantunanController::class, 'download']);

Route::get('regions/{level}', \App\Modules\Bantuan\Http\Controllers\RegionController::class)->middleware('throttle:60,1');

Route::post('applications/{id}/remind-survey', \App\Modules\Bantuan\Http\Controllers\SurveyReminderController::class)->middleware('throttle:10,1');
Route::post('applications/{id}/reminders', \App\Modules\Bantuan\Http\Controllers\ApplicationReminderController::class)->middleware('throttle:10,1');

Route::get('reports/full', \App\Modules\Bantuan\Http\Controllers\ReportController::class)->middleware('throttle:5,1');

Route::get('applications/{id}/reminder-recipients', [\App\Modules\Bantuan\Http\Controllers\ApplicationReminderController::class, 'recipients'])->middleware('throttle:30,1');
