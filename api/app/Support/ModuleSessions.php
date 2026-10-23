<?php

namespace App\Support;

use App\Contracts\Modules\ModuleSession;

class ModuleSessions
{
    private array $adapters = [];
    public function register(string $slug, string $class): void { $this->adapters[$slug] = $class; }
    public function has(string $slug): bool { return isset($this->adapters[$slug]); }
    public function for(string $slug): ModuleSession
    {
        abort_unless($this->has($slug), 404);
        return app($this->adapters[$slug]);
    }
    public function preferredPanel(array $access): ?string
    {
        foreach (array_unique(array_map(fn ($row) => $row->slug, $access)) as $slug) {
            if ($this->has($slug) && ($panel = $this->for($slug)->preferredPanel($access))) return $panel;
        }
        return null;
    }
}
