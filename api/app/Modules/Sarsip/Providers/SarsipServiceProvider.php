<?php

namespace App\Modules\Sarsip\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class SarsipServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::middleware('api')->prefix('api/v1/sarsip')->group(__DIR__.'/../routes/api.php');
    }
}
