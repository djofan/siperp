<?php

namespace App\Modules\Sip\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class SipServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::middleware('api')->prefix('api/v1/sip')->group(__DIR__.'/../routes/api.php');
    }
}
