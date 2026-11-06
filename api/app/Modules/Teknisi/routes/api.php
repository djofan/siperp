<?php

use App\Modules\Teknisi\Http\Controllers\OperationController;
use App\Modules\Teknisi\Http\Controllers\QueryController;
use App\Modules\Teknisi\Http\Controllers\WorkflowController;
use Illuminate\Support\Facades\Route;

Route::group([], function () {
    Route::middleware('module.public:teknisi')->group(function () {
        Route::get('public/outlets', [QueryController::class, 'publicOutlets']);
        Route::get('tracking/{token}', [QueryController::class, 'tracking']);
    });
    Route::middleware(['auth:sanctum', 'user.active'])->group(function () {
        Route::post('tickets', [WorkflowController::class, 'create']);
        Route::post('workflow', [WorkflowController::class, 'advance']);
        Route::get('service-finance', [WorkflowController::class, 'finance']);
        Route::get('media/{id}', [WorkflowController::class, 'media']);
        Route::patch('outlets/{id}', [OperationController::class, 'editOutlet']);
        foreach (['tickets' => 'ticketsList', 'new-ticket' => 'newTicket', 'outlets' => 'outletsList', 'parts' => 'parts', 'monitoring' => 'monitoring', 'people' => 'people', 'profile' => 'profile', 'participant-tickets' => 'participantTickets', 'ekspor' => 'export'] as $path => $method) {
            Route::get($path, [QueryController::class, $method]);
        }
        Route::get('tickets/{id}', [QueryController::class, 'detail']);
        Route::get('people/{id}', [QueryController::class, 'person']);
        foreach (['outlets' => 'outlet', 'technicians' => 'technician', 'tickets/link' => 'link', 'tickets/update' => 'update', 'parts' => 'part', 'parts/restock' => 'restock', 'parts/need' => 'need', 'parts/consume' => 'consume'] as $path => $method) {
            Route::post($path, [OperationController::class, $method]);
        }
    });
});
