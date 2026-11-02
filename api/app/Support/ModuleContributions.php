<?php

namespace App\Support;

use App\Contracts\Modules\ModuleContribution;

class ModuleContributions
{
    private array $modules = [];

    public function register(string $slug, string $adapter): void { $this->modules[$slug] = $adapter; }

    public function overview(\Carbon\CarbonImmutable $start, \Carbon\CarbonImmutable $end): array
    {
        $data = ['applications' => 0, 'courses' => [], 'enrollments' => 0, 'unanswered' => 0, 'beneficiaryLaz' => 0, 'beneficiarySar' => 0];
        $unavailable = [];
        foreach ($this->modules as $slug => $class) {
            try {
                $adapter = app($class);
                if (! $adapter instanceof ModuleContribution) throw new \LogicException('Invalid module contribution.');
                $data = array_replace($data, $adapter->overview($start, $end));
            } catch (\Throwable $error) {
                report($error);
                $unavailable[] = $slug;
            }
        }
        return [...$data, 'unavailableModules' => $unavailable];
    }

    public function contacts(): array
    {
        $rows = [];
        // Contact sync is explicit: fail instead of silently losing an unavailable source.
        foreach ($this->modules as $class) $rows = [...$rows, ...app($class)->contacts()];
        return $rows;
    }
}
