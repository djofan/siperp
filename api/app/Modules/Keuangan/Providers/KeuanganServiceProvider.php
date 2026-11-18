<?php

namespace App\Modules\Keuangan\Providers;

use App\Modules\Keuangan\Console\ImportLegacyFinance;
use App\Modules\Keuangan\Services\KeuanganAccess;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class KeuanganServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        if ($this->app->runningInConsole()) {
            $this->commands([ImportLegacyFinance::class]);
        }
        config(['modules.account_management.keuangan' => ['roles' => KeuanganAccess::ROLES, 'links' => []]]);
        Route::middleware('api')->prefix('api/v1/keuangan')->group(__DIR__.'/../routes/api.php');
    }
}
