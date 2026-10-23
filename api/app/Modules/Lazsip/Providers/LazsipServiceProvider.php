<?php

namespace App\Modules\Lazsip\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class LazsipServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->make(\App\Support\PaymentModules::class)->register('lazsip', \App\Modules\Lazsip\Services\LazsipPaymentModule::class);
        $this->app->make(\App\Support\ModuleContributions::class)->register('lazsip', \App\Modules\Lazsip\Services\LazsipContribution::class);
    }

    public function boot(): void
    {
        \App\Modules\Payment\Models\PaymentDonor::resolveRelationUsing('donations', fn ($donor) => $donor->hasMany(\App\Modules\Lazsip\Models\LazsipDonation::class, 'donor_id', 'id'));
        \App\Modules\Payment\Models\PaymentDonor::resolveRelationUsing('zakatPayments', fn ($donor) => $donor->hasMany(\App\Modules\Lazsip\Models\LazsipZakatPayment::class, 'donor_id', 'id'));
        Route::middleware('api')->prefix('api/v1/lazsip')->group(__DIR__.'/../routes/api.php');
    }
}
