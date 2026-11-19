<?php

use App\Modules\Keuangan\Http\Controllers\OverviewController;
use App\Modules\Keuangan\Http\Controllers\WorkflowController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'user.active', 'module.access:keuangan'])->group(function (): void {
    Route::get('overview', OverviewController::class);
    Route::get('expenses', [WorkflowController::class, 'expenses']);
    Route::post('expenses', [WorkflowController::class, 'saveExpense'])->middleware('throttle:30,1');
    Route::get('expenses/{id}', [WorkflowController::class, 'expense']);
    Route::put('expenses/{id}', [WorkflowController::class, 'saveExpense'])->middleware('throttle:30,1');
    Route::post('expenses/{id}/approval-requests', [WorkflowController::class, 'requestApproval'])->middleware('throttle:30,1');
    Route::get('expense-options', [WorkflowController::class, 'options']);
    Route::get('settings', [WorkflowController::class, 'settings']);
    Route::post('masters/{kind}', [WorkflowController::class, 'master'])->middleware('throttle:30,1');
    Route::post('approval-rules', [WorkflowController::class, 'rule'])->middleware('throttle:30,1');
    Route::put('approval-rules/{id}', [WorkflowController::class, 'rule'])->middleware('throttle:30,1');
    Route::get('approvals', [WorkflowController::class, 'approvals']);
    Route::get('approvals/{id}', [WorkflowController::class, 'approval']);
    Route::post('approvals/{id}/decisions', [WorkflowController::class, 'decide'])->middleware('throttle:30,1');

});
