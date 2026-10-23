<?php

namespace App\Modules\Tanwir\Providers;

use Illuminate\Support\Facades\Route;
use Illuminate\Support\ServiceProvider;

class TanwirServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->make(\App\Support\ModuleSessions::class)->register('tanwir', \App\Modules\Tanwir\Services\TanwirSession::class);
        $this->app->make(\App\Support\ParticipantModules::class)->registerMembership('tanwir', fn (string $userId) => \Illuminate\Support\Facades\DB::table('tanwir_members')->where('user_id', $userId)->exists());
    }

    public function boot(): void
    {
        Route::middleware('api')->prefix('api/v1/tanwir')->group(__DIR__.'/../routes/api.php');
    }
}
