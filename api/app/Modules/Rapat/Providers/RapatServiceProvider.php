<?php

namespace App\Modules\Rapat\Providers;

use App\Modules\Rapat\Http\PrivateAccess;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class RapatServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../../../../config/rapat.php', 'rapat');
    }

    public function boot(): void
    {
        config(['modules.account_management.rapat' => ['roles' => ['admin' => 'Administrator Rapat', 'secretary' => 'Sekretaris', 'viewer' => 'Pembaca'], 'links' => [['label' => 'Rapat', 'href' => '/admin/rapat']]]]);
        Route::prefix('api/v1/rapat')->middleware(['api', 'auth:sanctum', 'user.active', 'module.access:rapat', PrivateAccess::class])->group(__DIR__.'/../routes/api.php');
    }
}
