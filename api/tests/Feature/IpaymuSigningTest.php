<?php

use App\Modules\Payment\Services\IpaymuService;
use Carbon\Carbon;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

it('signs and sends identical JSON bytes using the official PHP sample format', function (string $gateway, string $host) {
    config([
        'payment.gateway' => $gateway,
        'payment.ipaymu.va' => '1179000000000000',
        'payment.ipaymu.api_key' => 'example-test-key-not-a-secret',
        'payment.ipaymu.base_url' => 'https://'.$host.'/api/v2',
        'payment.public_url' => 'https://erp.example.test',
        'payment.api_url' => 'https://erp.example.test/api/v1',
    ]);
    Http::preventStrayRequests();
    Http::fake([$host.'/*' => Http::response(['Status' => 200])]);
    $this->travelTo(Carbon::parse('2026-11-10 13:00:00', 'Asia/Jakarta'));

    // Fixed vector calculated independently using Python hashlib/hmac, not the
    // implementation under test. Includes URL slashes and a Unicode label.
    $payload = ['account' => '1179000000000000', 'url' => 'https://erp.example.test/callback', 'label' => 'Donasi — Air Bersih'];
    $body = '{"account":"1179000000000000","url":"https://erp.example.test/callback","label":"Donasi \u2014 Air Bersih"}';
    $method = new ReflectionMethod(IpaymuService::class, 'request');
    $method->invoke(app(IpaymuService::class), '/balance', $payload);

    Http::assertSent(function (Request $request) use ($body, $host) {
        expect($request->method())->toBe('POST')
            ->and($request->url())->toBe('https://'.$host.'/api/v2/balance')
            ->and($request->body())->toBe($body)
            ->and($request->header('va'))->toBe(['1179000000000000'])
            ->and($request->header('signature'))->toBe(['ce5274abe3835781b5b248e271dc04975993fcb4120ab1c5969a8a5976f34a65'])
            ->and($request->header('timestamp'))->toBe(['20261110130000'])
            ->and($request->header('Content-Type'))->toBe(['application/json']);

        return true;
    });
    Http::assertSentCount(1);
})->with([
    ['ipaymu', 'my.ipaymu.com'],
    ['ipaymu_sandbox', 'sandbox.ipaymu.com'],
]);
