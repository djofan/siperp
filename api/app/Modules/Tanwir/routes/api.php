<?php

use App\Modules\Tanwir\Http\Controllers\TaskRecapController;
use App\Support\LearningRoutes;
use Illuminate\Support\Facades\Route;

LearningRoutes::register('tanwir');

Route::middleware(['auth:sanctum', 'user.active'])->prefix('admin/task-recaps')->group(function () {
    Route::get('/', [TaskRecapController::class, 'index']);
    Route::get('/submissions/{id}', [TaskRecapController::class, 'submission']);
    Route::get('/{id}', [TaskRecapController::class, 'show']);
});
