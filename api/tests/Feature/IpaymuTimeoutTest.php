<?php

use App\Modules\Payment\Jobs\ProcessIpaymuCallback;
use App\Modules\Payment\Jobs\ReconcileIpaymuTransaction;
use App\Modules\Payment\Services\IpaymuService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config(['payment.gateway' => 'ipaymu', 'payment.ipaymu.va' => '1179000899',
        'payment.ipaymu.api_key' => 'test-key', 'payment.ipaymu.base_url' => 'https://my.ipaymu.com/api/v2',
        'payment.public_url' => 'https://erp.example.test', 'payment.api_url' => 'https://erp.example.test/api/v1']);
    Http::preventStrayRequests();
});

it('uses configured transport timeouts for the signed authentication probe', function () {
    config(['payment.ipaymu.timeout' => 95, 'payment.ipaymu.connect_timeout' => 12]);
    Http::fake(function ($request, $options) {
        expect($options['timeout'])->toBe(95.0)
            ->and($options['connect_timeout'])->toBe(12.0);

        return Http::response(['Status' => 200]);
    });
    expect(app(IpaymuService::class)->checkConnection()['ok'])->toBeTrue();
    Http::assertSentCount(1);
});

it('does not automatically retry a timed out provider request', function () {
    $attempts = 0;
    Http::fake(function () use (&$attempts) {
        $attempts++;
        throw new ConnectionException('Simulated timeout');
    });
    expect(fn () => app(IpaymuService::class)->checkConnection())->toThrow(ConnectionException::class);
    expect($attempts)->toBe(1);
});

it('bounds history and detail requests by a shared synchronization deadline', function () {
    $service = app(IpaymuService::class);
    $method = new ReflectionMethod($service, 'remainingTimeout');
    $remaining = $method->invoke($service, microtime(true) + 2);
    expect($remaining)->toBeGreaterThan(0)->toBeLessThanOrEqual(2);
    expect(fn () => $method->invoke($service, microtime(true) - 1))->toThrow(ConnectionException::class);
    Http::assertNothingSent();
});

it('keeps payment jobs shorter than the queue reservation at every supported timeout', function ($seconds) {
    config(['payment.ipaymu.sync_timeout' => 2 * $seconds]);
    $retryAfter = 2 * $seconds + 90;
    expect((new ReconcileIpaymuTransaction('test'))->timeout)->toBe(2 * $seconds + 30)->toBeLessThan($retryAfter)
        ->and((new ProcessIpaymuCallback([]))->timeout)->toBeLessThan($retryAfter);
})->with([60, 90, 120]);
