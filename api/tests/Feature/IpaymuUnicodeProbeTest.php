<?php

use App\Modules\Payment\Services\IpaymuService;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config(['payment.gateway' => 'ipaymu', 'payment.ipaymu.va' => '1179000899',
        'payment.ipaymu.api_key' => 'unicode-probe-test-key', 'payment.ipaymu.base_url' => 'https://my.ipaymu.com/api/v2',
        'payment.public_url' => 'https://erp.example.test', 'payment.api_url' => 'https://erp.example.test/api/v1']);
    Http::preventStrayRequests();
});

it('does not send requests unless the unicode command is explicitly remote', function () {
    $this->artisan('payment:ipaymu-unicode-check')->assertSuccessful();
    Http::assertNothingSent();
});

it('signs equivalent unicode payloads differently and only sends balance requests', function () {
    $bodies = [];
    Http::fake(function ($request, $options) use (&$bodies) {
        $body = $request->body();
        $bodies[] = $body;
        expect($request->url())->toBe('https://my.ipaymu.com/api/v2/balance')
            ->and($request->method())->toBe('POST')
            ->and($request->header('signature')[0])->toBe(hash_hmac('sha256', 'POST:1179000899:'.hash('sha256', $body).':unicode-probe-test-key', 'unicode-probe-test-key'))
            ->and($options['allow_redirects'])->toBeFalse();

        return Http::response(['Status' => 200, 'Data' => ['Balance' => 'PRIVATE_BALANCE']]);
    });
    $results = iterator_to_array(app(IpaymuService::class)->probeUnicodeSerialization());
    expect($results)->toHaveCount(3)
        ->and($bodies[0])->toBe('{"account":"1179000899"}')
        ->and($bodies[1])->toContain('\\u2014', '\\u00c9', '\\u65e5\\u672c')
        ->and($bodies[2])->toContain('— É 日本')
        ->and($bodies[1])->not->toBe($bodies[2])
        ->and(json_decode($bodies[1], true))->toBe(json_decode($bodies[2], true))
        ->and(json_encode($results))->not->toContain('PRIVATE_BALANCE', '1179000899', 'unicode-probe-test-key');
    Http::assertSentCount(3);
});

it('continues after a connection failure without retrying or leaking exception content', function () {
    $attempts = 0;
    Http::fake(function () use (&$attempts) {
        if (++$attempts === 1) {
            throw new ConnectionException('secret exception content');
        }

        return Http::response(['Status' => 401, 'Message' => 'Unauthorized Signature']);
    });
    $exit = Artisan::call('payment:ipaymu-unicode-check', ['--remote' => true]);
    expect($exit)->toBe(1)->and($attempts)->toBe(3)
        ->and(Artisan::output())->toContain('IPAYMU_CONNECTION_FAILED', 'unicode_escaped', 'unicode_utf8', 'belum konklusif')
        ->not->toContain('secret exception content', 'unicode-probe-test-key', '1179000899');
});

it('does not display financial values on successful probes', function () {
    Http::fake(['*/balance' => Http::response(['Status' => 200, 'Data' => ['Balance' => 'SECRET_FINANCIAL_VALUE']])]);
    $exit = Artisan::call('payment:ipaymu-unicode-check', ['--remote' => true]);
    expect($exit)->toBe(0)->and(Artisan::output())->toContain('control', 'unicode_escaped', 'unicode_utf8')
        ->not->toContain('SECRET_FINANCIAL_VALUE', 'unicode-probe-test-key', '1179000899');
    Http::assertSentCount(3);
});
