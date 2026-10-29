<?php

namespace App\Modules\Sarsip\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class SarsipServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->make(\App\Support\PaymentModules::class)->register('sarsip', \App\Modules\Sarsip\Services\SarsipPaymentModule::class);
        $this->app->make(\App\Support\ModuleContributions::class)->register('sarsip', \App\Modules\Sarsip\Services\SarsipContribution::class);
    }

    public function boot(): void
    {
        Route::middleware('api')->prefix('api/v1/sarsip')->group(__DIR__.'/../routes/api.php');
    }
}
