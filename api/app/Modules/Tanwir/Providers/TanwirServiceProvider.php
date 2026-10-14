<?php

namespace App\Modules\Tanwir\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class TanwirServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        Route::middleware('api')->prefix('api/v1/tanwir')->group(__DIR__.'/../routes/api.php');
    }
}
