<?php

namespace App\Modules\Core\Http\Controllers;

use App\Modules\Core\Http\Resources\HealthResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Throwable;

class HealthController
{
    public function __invoke(): JsonResponse
    {
        try {
            DB::select('SELECT 1');
            $connected = true;
        } catch (Throwable $exception) {
            report($exception);
            $connected = false;
        }

        return (new HealthResource(['status' => $connected ? 'ok' : 'degraded', 'database' => ['status' => $connected ? 'connected' : 'unavailable']]))->response()->setStatusCode($connected ? 200 : 503);
    }
}
