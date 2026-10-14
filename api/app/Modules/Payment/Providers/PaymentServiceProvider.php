<?php

namespace App\Modules\Payment\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class PaymentServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::middleware('api')->prefix('api/v1/payment')->group(__DIR__.'/../routes/api.php');
    }
}
