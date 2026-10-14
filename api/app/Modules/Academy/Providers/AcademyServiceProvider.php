<?php

namespace App\Modules\Academy\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AcademyServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::middleware('api')->prefix('api/v1/academy')->group(__DIR__.'/../routes/api.php');
    }
}
