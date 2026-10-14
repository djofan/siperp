<?php

namespace App\Modules\Lazsip\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class LazsipServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::middleware('api')->prefix('api/v1/lazsip')->group(__DIR__.'/../routes/api.php');
    }
}
