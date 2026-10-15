<?php

use App\Modules\Teknisi\Http\Controllers\OperationController;
use App\Modules\Teknisi\Http\Controllers\QueryController;
use Illuminate\Support\Facades\Route;

Route::group([], function () {
    Route::middleware('module.public:teknisi')->group(function () {
        Route::get('public/outlets', [QueryController::class, 'publicOutlets']);
        Route::get('tracking/{token}', [QueryController::class, 'tracking']);
    });
    Route::middleware(['auth:sanctum', 'user.active'])->group(function () {
        foreach (['tickets' => 'ticketsList', 'new-ticket' => 'newTicket', 'outlets' => 'outletsList', 'parts' => 'parts', 'monitoring' => 'monitoring', 'people' => 'people', 'profile' => 'profile', 'participant-tickets' => 'participantTickets', 'ekspor' => 'export'] as $path => $method) {
            Route::get($path, [QueryController::class, $method]);
        }
        Route::get('tickets/{id}', [QueryController::class, 'detail']);
        Route::get('people/{id}', [QueryController::class, 'person']);
        foreach (['outlets' => 'outlet', 'technicians' => 'technician', 'tickets' => 'createTicket', 'tickets/link' => 'link', 'tickets/update' => 'update', 'parts' => 'part', 'parts/restock' => 'restock', 'parts/need' => 'need', 'parts/consume' => 'consume'] as $path => $method) {
            Route::post($path, [OperationController::class, $method]);
        }
    });
});
