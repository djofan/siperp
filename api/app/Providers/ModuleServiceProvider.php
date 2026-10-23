<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class ModuleServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->app->singleton(\App\Support\PaymentModules::class);
        $this->app->singleton(\App\Support\ModuleContributions::class);
        $this->app->singleton(\App\Support\ParticipantModules::class);
        $this->app->singleton(\App\Support\ModuleSessions::class);
        foreach (config('modules.providers', []) as $provider) {
            $this->app->register($provider);
        }
    }
}
