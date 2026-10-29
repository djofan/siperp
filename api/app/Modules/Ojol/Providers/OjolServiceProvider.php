<?php

namespace App\Modules\Ojol\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class OjolServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->make(\App\Support\ModuleSessions::class)->register('ojol', \App\Modules\Ojol\Services\OjolSession::class);
        $this->app->make(\App\Support\ParticipantModules::class)->registerMembership('ojol', fn (string $userId) => \Illuminate\Support\Facades\DB::table('ojol_members')->where('user_id', $userId)->exists());
    }

    public function boot(): void
    {
        config(['modules.account_management.ojol' => ['roles' => [], 'links' => [['label' => 'Daftarkan guru', 'href' => '/admin/ojol/guru/baru'], ['label' => 'Daftarkan peserta', 'href' => '/admin/ojol/peserta/baru']]]]);
        Route::middleware('api')->prefix('api/v1/ojol')->group(__DIR__.'/../routes/api.php');
    }
}
