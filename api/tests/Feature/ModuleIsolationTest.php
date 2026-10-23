<?php

use App\Support\ModuleContributions;
use App\Support\ModuleSessions;
use App\Support\PaymentModules;
use App\Modules\Teknisi\Services\TeknisiSession;
use Carbon\CarbonImmutable;

it('resolves a session without constructing another module adapter', function () {
    $sessions = new ModuleSessions;
    $sessions->register('unavailable', 'MissingModuleSession');
    $sessions->register('teknisi', TeknisiSession::class);

    expect($sessions->for('teknisi'))->toBeInstanceOf(TeknisiSession::class)
        ->and($sessions->has('academy'))->toBeFalse()
        ->and($sessions->preferredPanel([(object) ['slug' => 'teknisi', 'role' => 'technician']]))->toBe('/teknisi/panel');
});

it('rejects a missing payment module instead of using another module rules', function () {
    $modules = new PaymentModules;
    expect($modules->has('lazsip'))->toBeFalse();

    try {
        $modules->for('lazsip');
        test()->fail('A missing module must not be resolved.');
    } catch (\Symfony\Component\HttpKernel\Exception\HttpException $error) {
        expect($error->getStatusCode())->toBe(404);
    }
});

it('keeps the overview available when one optional source fails', function () {
    $modules = new ModuleContributions;
    $modules->register('unavailable', 'MissingModuleContribution');
    $data = $modules->overview(CarbonImmutable::now()->startOfMonth(), CarbonImmutable::now());

    expect($data['unavailableModules'])->toBe(['unavailable'])
        ->and($data['applications'])->toBe(0)
        ->and($data['courses'])->toBe([]);
});
