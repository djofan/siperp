<?php

namespace App\Modules\Academy\Providers;

use App\Modules\Academy\Services\AcademyContribution;
use App\Modules\Academy\Services\AcademyParticipants;
use App\Modules\Academy\Services\AcademySession;
use App\Support\ModuleContributions;
use App\Support\ModuleSessions;
use App\Support\ParticipantModules;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class AcademyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->make(ModuleSessions::class)->register('academy', AcademySession::class);
        $this->app->make(ModuleContributions::class)->register('academy', AcademyContribution::class);
        $this->app->make(ParticipantModules::class)->register('academy', AcademyParticipants::class);
    }

    public function boot(): void
    {
        config(['modules.account_management.academy' => ['roles' => ['editor' => 'Editor Academy'], 'links' => [['label' => 'Daftarkan peserta Academy', 'href' => '/admin/academy/pendaftaran']]]]);
        Route::middleware('api')->prefix('api/v1/academy')->group(__DIR__.'/../routes/api.php');
    }
}
