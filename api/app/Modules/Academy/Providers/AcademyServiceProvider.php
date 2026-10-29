<?php

namespace App\Modules\Academy\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AcademyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->make(\App\Support\ModuleSessions::class)->register('academy', \App\Modules\Academy\Services\AcademySession::class);
        $this->app->make(\App\Support\ModuleContributions::class)->register('academy', \App\Modules\Academy\Services\AcademyContribution::class);
        $this->app->make(\App\Support\ParticipantModules::class)->register('academy', \App\Modules\Academy\Services\AcademyParticipants::class);
    }

    public function boot(): void
    {
        config(['modules.account_management.academy' => ['roles' => ['teacher' => 'Pengajar', 'editor' => 'Editor Academy'], 'links' => [['label' => 'Daftarkan peserta Academy', 'href' => '/admin/academy/pendaftaran']]]]);
        Route::middleware('api')->prefix('api/v1/academy')->group(__DIR__.'/../routes/api.php');
    }
}
