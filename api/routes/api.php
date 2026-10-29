<?php

use App\Modules\Core\Http\Controllers\BackupController;
use App\Modules\Core\Http\Controllers\ErpContactController;
use App\Modules\Core\Http\Controllers\ErpFinanceController;
use App\Modules\Core\Http\Controllers\ErpOverviewController;
use App\Modules\Core\Http\Controllers\HealthController;
use App\Modules\Core\Http\Controllers\LoginController;
use App\Modules\Core\Http\Controllers\ModuleController;
use App\Modules\Core\Http\Controllers\ModuleSessionController;
use App\Modules\Core\Http\Controllers\ParticipantController;
use App\Modules\Core\Http\Controllers\SessionController;
use App\Modules\Core\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::get('/health', HealthController::class);
Route::post('/auth/login', LoginController::class)->middleware('throttle:login');
Route::get('/core/modules', [ModuleController::class, 'index']);
Route::get('/core/modules/{slug}', [ModuleController::class, 'show']);
Route::post('/{module}/auth/login', [ModuleSessionController::class, 'login'])->where('module', 'tanwir|ojol')->middleware('throttle:login');
Route::post('/{module}/masuk', [ModuleSessionController::class, 'login'])->where('module', 'academy|teknisi')->middleware('throttle:login');
Route::get('/academy/availability', [ModuleSessionController::class, 'availability']);
Route::middleware(['auth:sanctum', 'user.active'])->group(function (): void {
    Route::post('/{module}/participants', [ParticipantController::class, 'store'])->where('module', 'academy|teknisi');
    Route::put('/{module}/participants/{id}', [ParticipantController::class, 'update'])->where('module', 'academy|teknisi');
    Route::delete('/{module}/participants/{id}', [ParticipantController::class, 'destroy'])->where('module', 'academy|teknisi');
    Route::get('/auth/me', [SessionController::class, 'show']);
    Route::post('/auth/logout', [SessionController::class, 'destroy']);
    Route::get('/{module}/viewer', [ModuleSessionController::class, 'viewer'])->where('module', 'tanwir|ojol|academy|teknisi');
    Route::middleware('superadmin')->group(function (): void {
        Route::prefix('super/erp')->group(function () {
            $finance = ErpFinanceController::class;
            $contacts = ErpContactController::class;
            Route::get('overview', ErpOverviewController::class);
            Route::get('finance', [$finance, 'index']);
            Route::post('expenses', [$finance, 'expense']);
            Route::post('bank-lines/import', [$finance, 'import']);
            Route::post('bank-lines/match', [$finance, 'match']);
            Route::post('bank-lines/unmatch', [$finance, 'unmatch']);
            Route::get('export', [$finance, 'export']);
            Route::get('contacts', [$contacts, 'index']);
            Route::post('contacts', [$contacts, 'save']);
            Route::post('contacts/sync', [$contacts, 'sync']);
            Route::post('contacts/merge', [$contacts, 'merge']);
            $backup = BackupController::class;
            Route::get('backups', [$backup, 'index']);
            Route::post('backups', [$backup, 'store']);
            Route::post('backups/verify', [$backup, 'verify']);
            Route::get('backup/{id}', [$backup, 'download']);
        });
        Route::get('/core/overview', [ModuleController::class, 'overview']);
        Route::get('/core/activity', [ModuleController::class, 'activity']);
        Route::get('/super/akun', [UserController::class, 'index']);
        Route::post('/super/akun', [UserController::class, 'store']);
        Route::get('/super/akun/{id}', [UserController::class, 'show']);
        Route::put('/super/akun/{id}', [UserController::class, 'update']);
        Route::delete('/super/akun/{id}', [UserController::class, 'destroy']);
        Route::put('/super/akun/{id}/status', [UserController::class, 'status']);
        Route::put('/super/akun/{id}/access', [UserController::class, 'access']);
        Route::put('/super/modul/{id}/status', [ModuleController::class, 'status']);
    });
});
