<?php

namespace App\Support;

use App\Contracts\Modules\ParticipantModule;

class ParticipantModules
{
    private array $adapters = [];
    private array $memberships = [];
    public function register(string $slug, string $class): void { $this->adapters[$slug] = $class; }
    public function registerMembership(string $slug, \Closure $check): void { $this->memberships[$slug] = $check; }
    public function for(string $slug): ParticipantModule
    {
        abort_unless(isset($this->adapters[$slug]), 404);
        return app($this->adapters[$slug]);
    }
    public function hasMembership(string $userId): bool
    {
        foreach ($this->adapters as $class) if (app($class)->hasMembership($userId)) return true;
        foreach ($this->memberships as $check) if ($check($userId)) return true;
        return false;
    }
}
