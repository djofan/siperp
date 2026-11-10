<?php

use App\Modules\Payment\Models\PaymentDonor;
use App\Modules\Payment\Models\PaymentTransaction;
use App\Modules\Payment\Services\IpaymuService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config(['payment.gateway' => 'ipaymu', 'payment.ipaymu.va' => '1179000899', 'payment.ipaymu.api_key' => 'signature-test-key',
        'payment.ipaymu.base_url' => 'https://my.ipaymu.com/api/v2', 'payment.public_url' => 'https://erp.example.test', 'payment.api_url' => 'https://erp.example.test/api/v1']);
    Http::preventStrayRequests();
});

it('matches an independently calculated HMAC vector on the exact outgoing bytes', function () {
    Http::fake(['https://my.ipaymu.com/api/v2/balance' => Http::response(['Status' => 200, 'Data' => ['MerchantBalance' => 'private-balance']])]);
    $this->travelTo(Carbon\CarbonImmutable::parse('2026-11-10 12:34:56', 'Asia/Jakarta'));
    expect(app(IpaymuService::class)->checkConnection())->toBe(['ok' => true, 'httpStatus' => 200, 'providerStatus' => 200, 'code' => 'IPAYMU_AUTH_OK']);
    Http::assertSent(fn (Request $request) => $request->method() === 'POST'
        && $request->body() === '{"account":"1179000899"}'
        && $request->hasHeader('signature', '6b3884278111ed3c8ebb26215bf16b1ea48cc932ff6017d42936077b8949da64')
        && $request->hasHeader('va', '1179000899') && $request->hasHeader('timestamp', '20261110123456')
        && str_starts_with($request->header('Content-Type')[0], 'application/json'));
    Http::assertSentCount(1);
});

it('normalizes accidental edge whitespace consistently for the header body and signature', function () {
    config(['payment.ipaymu.va' => " 1179000899\r\n", 'payment.ipaymu.api_key' => "\tsignature-test-key \n"]);
    Http::fake(['*/balance' => Http::response(['Status' => 200])]);
    expect(app(IpaymuService::class)->checkConnection()['ok'])->toBeTrue();
    Http::assertSent(fn (Request $request) => $request->hasHeader('va', '1179000899')
        && $request->body() === '{"account":"1179000899"}'
        && $request->hasHeader('signature', '6b3884278111ed3c8ebb26215bf16b1ea48cc932ff6017d42936077b8949da64'));
});

it('rejects internal whitespace in API keys before calling iPaymu', function () {
    config(['payment.ipaymu.api_key' => "signature\r\ntest-key"]);
    try { app(IpaymuService::class)->checkConnection(); $this->fail('Invalid key must be rejected'); }
    catch (Symfony\Component\HttpKernel\Exception\HttpException $error) { expect($error->getStatusCode())->toBe(503); }
    Http::assertNothingSent();
});

it('signs production checkout JSON containing unicode and URLs exactly as transmitted', function () {
    Http::fake(['*/payment' => Http::response(['Status' => 200, 'Data' => ['SessionID' => 'unicode-session', 'Url' => 'https://my.ipaymu.com/payment/unicode-session']])]);
    $row = (new PaymentTransaction)->forceFill(['id' => 'unicode-contract', 'gatewayReferenceId' => 'ref-unicode', 'gatewayAccountId' => '1179000899',
        'trackingCode' => 'LZS-TEST01', 'moduleSource' => 'lazsip', 'sourceType' => 'campaign', 'amount' => 100007, 'adminFee' => 0]);
    $row->setRelation('donor', (new PaymentDonor)->forceFill(['name' => 'Penguji É & 日本', 'email' => 'donor@example.test', 'phone' => '628123456789']));
    app(IpaymuService::class)->createSession($row);
    Http::assertSent(function (Request $request) {
        $data = json_decode($request->body(), true);
        $officialBody = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
        $officialSignature = hash_hmac('sha256', 'POST:1179000899:'.strtolower(hash('sha256', $officialBody)).':signature-test-key', 'signature-test-key');
        return $request->body() === $officialBody && $data['buyerName'] === 'Penguji É & 日本'
            && $request->method() === 'POST' && $request->hasHeader('signature', $officialSignature)
            && str_contains($request->body(), 'https://erp.example.test/');
    });
});

it('distinguishes signature rejections from domain and IP errors without echoing provider data', function (string $message, string $code) {
    $response = Http::response(['Status' => 401, 'Message' => $message, 'Data' => ['private' => 'secret']]);
    Http::fake(['*/balance' => $response]);
    $result = app(IpaymuService::class)->checkConnection();
    expect($result['ok'])->toBeFalse()->and($result['code'])->toBe($code)->and(json_encode($result))->not->toContain('secret', $message);
})->with([
    ['Unauthorized Signature', 'IPAYMU_SIGNATURE_REJECTED'],
    ['Invalid Domain', 'IPAYMU_DOMAIN_REJECTED'],
    ['Invalid IP', 'IPAYMU_IP_REJECTED'],
]);

it('does not make a remote request for the default configuration command', function () {
    $this->artisan('payment:ipaymu-check')->assertSuccessful();
    Http::assertNothingSent();
});

it('checks authentication with the balance endpoint only and does not print balance or credentials', function () {
    Http::fake(['*/balance' => Http::response(['Status' => 200, 'Data' => ['MerchantBalance' => '999999999PRIVATE']])]);
    Illuminate\Support\Facades\Artisan::call('payment:ipaymu-check', ['--remote' => true]);
    $output = Illuminate\Support\Facades\Artisan::output();
    expect($output)->toContain('IPAYMU_AUTH_OK')->not->toContain('999999999PRIVATE', 'signature-test-key', '1179000899');
    Http::assertSentCount(1);
    Http::assertSent(fn (Request $request) => str_ends_with($request->url(), '/balance'));
});

it('reports a signature rejection with a failing command exit code', function () {
    Http::fake(['*/balance' => Http::response(['Status' => 401, 'Message' => 'Unauthorized Signature'], 401)]);
    $this->artisan('payment:ipaymu-check', ['--remote' => true])->expectsOutputToContain('IPAYMU_SIGNATURE_REJECTED')->assertExitCode(1);
});
