<?php

namespace App\Contracts\Modules;

interface ModuleContribution
{
    public function overview(\Carbon\CarbonImmutable $start, \Carbon\CarbonImmutable $end): array;
    public function contacts(): array;
}
