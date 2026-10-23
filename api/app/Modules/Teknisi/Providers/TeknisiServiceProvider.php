<?php

namespace App\Modules\Teknisi\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class TeknisiServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->make(\App\Support\ModuleSessions::class)->register('teknisi', \App\Modules\Teknisi\Services\TeknisiSession::class);
        $this->app->make(\App\Support\ParticipantModules::class)->register('teknisi', \App\Modules\Teknisi\Services\TeknisiParticipants::class);
    }

    public function boot(): void
    {
        Route::middleware('api')->prefix('api/v1/teknisi')->group(__DIR__.'/../routes/api.php');
    }
}
