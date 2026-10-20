<?php

use App\Modules\Payment\Models\PaymentDonor;
use App\Modules\Payment\Models\PaymentTransaction;
use App\Modules\Payment\Services\IpaymuService;
use App\Modules\Payment\Services\ReceiptService;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config()->set('payment.public_url', 'http://localhost:3000');
    config()->set('payment.api_url', 'http://localhost:8000/api/v1');
    config()->set('payment.ipaymu.api_key', 'ipaymu-contract-api-key');
    config()->set('payment.ipaymu.va', '1179000899');
    config()->set('payment.ipaymu.base_url', 'https://sandbox.ipaymu.com/api/v2');
    config()->set('payment.resend.key', 're_contract_test');
    config()->set('payment.resend.from', 'Siperp <noreply@example.test>');
    Http::preventStrayRequests();
});

it('creates an iPaymu sandbox session with the expected signed contract', function () {
    Http::fake([
        'https://sandbox.ipaymu.com/api/v2/payment' => Http::response([
            'Status' => 200,
            'Message' => 'success',
            'Data' => [
                'SessionID' => 'sandbox-session-id',
                'Url' => 'https://sandbox.ipaymu.com/payment/sandbox-session-id',
            ],
        ]),
    ]);

    $donor = new PaymentDonor;
    $donor->forceFill(['name' => 'Penguji', 'email' => 'recipient@example.test', 'phone' => '628123456789']);
    $transaction = new PaymentTransaction;
    $transaction->forceFill([
        'id' => 'payment-contract-test',
        'trackingCode' => 'TRACK-CONTRACT-001',
        'moduleSource' => 'lazsip',
        'sourceType' => 'campaign',
        'gatewayReferenceId' => 'SIPERP-CONTRACT-001',
        'gatewayAccountId' => '1179000899',
        'amount' => 100000,
        'adminFee' => 2500,
    ]);
    $transaction->setRelation('donor', $donor);

    expect(app(IpaymuService::class)->createSession($transaction))->toBe([
        'sessionId' => 'sandbox-session-id',
        'url' => 'https://sandbox.ipaymu.com/payment/sandbox-session-id',
    ]);

    Http::assertSent(function (Request $request) {
        $body = $request->body();
        $expected = hash_hmac('sha256', 'POST:1179000899:'.hash('sha256', $body).':ipaymu-contract-api-key', 'ipaymu-contract-api-key');

        return $request->url() === 'https://sandbox.ipaymu.com/api/v2/payment'
            && $request->hasHeader('va', '1179000899')
            && $request->hasHeader('signature', $expected)
            && preg_match('/^\d{14}$/D', $request->header('timestamp')[0] ?? '')
            && $request['referenceId'] === 'SIPERP-CONTRACT-001'
            && $request['price'] === [102500]
            && $request['notifyUrl'] === 'http://localhost:8000/api/v1/payment/webhook/ipaymu'
            && $request['returnUrl'] === 'http://localhost:3000/payment/checkout/payment-contract-test';
    });
});

it('verifies iPaymu callback signatures and rejects a modified amount', function () {
    $payload = [
        'reference_id' => 'SIPERP-CONTRACT-001',
        'trx_id' => '4719',
        'status_code' => '1',
        'transaction_status_code' => '1',
        'paid_off' => '100000',
        'is_escrow' => '0',
        'amount' => '102500',
        'url' => 'https://example.test/api/v1/payment/webhook/ipaymu',
    ];
    $normalized = [
        'additional_info' => [],
        'amount' => '102500',
        'is_escrow' => false,
        'paid_off' => 100000,
        'reference_id' => 'SIPERP-CONTRACT-001',
        'status_code' => 1,
        'transaction_status_code' => 1,
        'trx_id' => 4719,
        'url' => 'https://example.test/api/v1/payment/webhook/ipaymu',
    ];
    $signature = hash_hmac('sha256', json_encode($normalized, JSON_THROW_ON_ERROR), '1179000899');
    $gateway = app(IpaymuService::class);
    expect($gateway->verifyCallback($payload, $signature))->toBeTrue();

    $payload['amount'] = '1';
    expect($gateway->verifyCallback($payload, $signature))->toBeFalse();
});

it('sends the Resend tracking-email contract with bearer authentication', function () {
    Http::fake(['https://api.resend.com/emails' => Http::response(['id' => 'email-contract-test'])]);

    $donor = new PaymentDonor;
    $donor->forceFill(['name' => 'Penguji', 'email' => 'recipient@example.test']);
    $transaction = new PaymentTransaction;
    $transaction->forceFill([
        'id' => 'payment-contract-test',
        'trackingCode' => 'TRACK-CONTRACT-001',
        'amount' => 100000,
        'adminFee' => 2500,
    ]);
    $transaction->setRelation('donor', $donor);

    app(ReceiptService::class)->tracking($transaction);

    Http::assertSent(fn (Request $request) => $request->url() === 'https://api.resend.com/emails'
        && $request->hasHeader('Authorization', 'Bearer re_contract_test')
        && $request['from'] === 'Siperp <noreply@example.test>'
        && $request['to'] === 'recipient@example.test'
        && str_contains($request['subject'], 'TRACK-CONTRACT-001')
        && str_contains($request['html'], 'Rp102.500')
    );
});
