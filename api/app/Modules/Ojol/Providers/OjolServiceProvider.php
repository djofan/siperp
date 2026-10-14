<?php

namespace App\Modules\Ojol\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class OjolServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::middleware('api')->prefix('api/v1/ojol')->group(__DIR__.'/../routes/api.php');
    }
}
