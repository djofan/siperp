<?php

use App\Modules\Payment\Jobs\ProcessIpaymuCallback;
use App\Modules\Payment\Jobs\ReconcileIpaymuTransaction;
use App\Modules\Payment\Models\PaymentTransaction;
use App\Modules\Payment\Services\IpaymuService;
use App\Modules\Payment\Services\TransactionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Symfony\Component\HttpKernel\Exception\HttpException;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['payment.gateway' => 'ipaymu_sandbox', 'payment.ipaymu.api_key' => 'test-key', 'payment.ipaymu.va' => 'testVA', 'payment.ipaymu.base_url' => 'https://sandbox.ipaymu.com/api/v2', 'payment.public_url' => 'http://localhost:3000', 'payment.api_url' => 'http://localhost:8000/api/v1', 'payment.resend.key' => null]);
    DB::table('payment_donors')->insert(['id' => 'donor-test', 'name' => 'Test']);
    DB::table('payment_destination_accounts')->insert(['id' => 'account-test', 'module_source' => 'lazsip', 'fund_type' => 'infak', 'bank_name' => 'Test', 'account_number' => '123', 'account_name' => 'Test']);
    $this->row = new PaymentTransaction;
    $this->row->forceFill(['id' => 'transaction-test', 'trackingCode' => 'LZS-TEST', 'moduleSource' => 'lazsip', 'sourceType' => 'campaign', 'sourceId' => 'campaign-test', 'fundType' => 'infak', 'donorId' => 'donor-test', 'destinationAccountId' => 'account-test', 'amount' => 25000000, 'paymentMethod' => 'iPaymu Sandbox', 'gateway' => 'ipaymu_sandbox', 'gatewayState' => 'ready', 'gatewayAccountId' => 'testVA', 'gatewayReferenceId' => 'SIP-test', 'gatewaySessionId' => 'session-test'])->save();
    $this->row->refresh();
    $this->detail = ['TransactionId' => 123, 'ReferenceId' => 'SIP-test', 'SessionId' => 'session-test', 'SubTotal' => 25000000, 'Amount' => 25450000, 'Status' => 1, 'PaidStatus' => 'paid'];
    Http::preventStrayRequests();
});

it('identifies a rejected signature and retries the same unpaid transaction after configuration is corrected', function () {
    $this->row->forceFill(['gatewayState' => 'not_started', 'gatewaySessionId' => null, 'gatewayCheckoutUrl' => null])->save();
    Http::fake(['*/payment' => Http::sequence()->push(['Status' => 401, 'Message' => 'Unauthorized Signature', 'Private' => 'private-provider-value'], 401)->push(['Status' => 200, 'Data' => ['SessionID' => 'retry-session', 'Url' => 'https://sandbox-payment.ipaymu.com/?sid=retry-session']])]);
    $url = '/api/v1/payment/gateway-session/'.$this->row->id;
    $response = $this->postJson($url)->assertStatus(502);
    expect($response->json('error.message'))->toContain('IPAYMU_SIGNATURE_REJECTED')->not->toContain('private-provider-value');
    expect($this->row->refresh()->gatewayState)->toBe('not_started')->and($this->row->status)->toBe('pending');

    $this->postJson($url)->assertOk()->assertJsonPath('url', 'https://sandbox-payment.ipaymu.com/?sid=retry-session');
    expect($this->row->refresh()->gatewayState)->toBe('ready')->and($this->row->status)->toBe('pending')->and(PaymentTransaction::count())->toBe(1);
});

it('verifies and links gateway IDs using subtotal and finalizes only once', function () {
    Http::fake(['sandbox.ipaymu.com/*' => Http::response(['Status' => 200, 'Data' => $this->detail])]);
    $gateway = app(IpaymuService::class);
    $row = $gateway->sync($this->row, '123');
    expect($row->status)->toBe('paid')->and($row->gatewayTransactionId)->toBe('123')->and($row->gatewayState)->toBe('settled');
    $paidAt = $row->paidAt->toISOString();
    expect($gateway->sync($row)->paidAt->toISOString())->toBe($paidAt);
});

it('stores a hosted production session and reuses it without another provider request', function () {
    config(['payment.gateway' => 'ipaymu', 'payment.ipaymu.base_url' => 'https://my.ipaymu.com/api/v2',
        'payment.public_url' => 'https://erp.example.test', 'payment.api_url' => 'https://erp.example.test/api/v1']);
    $this->row->forceFill(['gateway' => 'ipaymu', 'gatewayState' => 'not_started', 'gatewaySessionId' => null, 'gatewayCheckoutUrl' => null])->save();
    $url = 'https://payment.ipaymu.com/#production-hosted-session';
    Http::fake(['*/payment' => Http::response(['Status' => '200', 'Data' => ['SessionID' => 'production-hosted-session', 'Url' => $url]])]);
    $endpoint = '/api/v1/payment/gateway-session/'.$this->row->id;
    $this->postJson($endpoint)->assertOk()->assertJsonPath('url', $url);
    $this->postJson($endpoint)->assertOk()->assertJsonPath('url', $url);
    expect($this->row->refresh()->gatewaySessionId)->toBe('production-hosted-session')
        ->and($this->row->gatewayState)->toBe('ready')->and($this->row->status)->toBe('pending');
    Http::assertSentCount(1);
});

it('discovers missing gateway ID from merchant history then verifies authoritative details', function () {
    Http::fake([
        '*/history' => Http::response(['Status' => 200, 'Data' => ['Transaction' => [['TransactionId' => 123, 'ReferenceId' => 'SIP-test']], 'Pagination' => ['total_pages' => 1]]]),
        '*/transaction' => Http::response(['Status' => 200, 'Data' => $this->detail]),
    ]);
    $row = app(IpaymuService::class)->sync($this->row);
    expect($row->status)->toBe('paid')->and($row->gatewayTransactionId)->toBe('123');
});

it('queues bounded background reconciliation without making a status read wait for the provider', function () {
    Queue::fake();
    Cache::flush();
    Http::fake();
    $gateway = app(IpaymuService::class);
    $gateway->enqueueReconciliation($this->row);
    $gateway->enqueueReconciliation($this->row);
    Queue::assertPushed(ReconcileIpaymuTransaction::class, 1);
    Http::assertNothingSent();
});

it('keeps escrow out of spendable totals and settles later', function () {
    Http::fake(['sandbox.ipaymu.com/*' => Http::sequence()->push(['Status' => 200, 'Data' => [...$this->detail, 'Status' => 7]])->push(['Status' => 200, 'Data' => $this->detail])]);
    $gateway = app(IpaymuService::class);
    $row = $gateway->sync($this->row, '123');
    expect($row->status)->toBe('pending')->and($row->gatewayState)->toBe('escrow');
    expect(app(TransactionService::class)->publicData($row)['status'])->toBe('escrow');
    expect(PaymentTransaction::where('status', 'paid')->sum('amount'))->toBe(0);
    expect($gateway->sync($row)->status)->toBe('paid');
});

it('rejects mismatched references sessions and subtotals before saving', function (string $field, mixed $value) {
    Http::fake(['sandbox.ipaymu.com/*' => Http::response(['Status' => 200, 'Data' => [...$this->detail, $field => $value]])]);
    try {
        app(IpaymuService::class)->sync($this->row, '123');
        $this->fail('Must reject mismatched details');
    } catch (HttpException $error) {
        expect($error->getStatusCode())->toBe(422);
    }
    expect($this->row->refresh()->gatewayTransactionId)->toBeNull()->and($this->row->status)->toBe('pending');
})->with([['ReferenceId', 'wrong'], ['SessionId', 'wrong'], ['SubTotal', 1], ['PaidStatus', 'unpaid']]);

it('verifies callback via API even when merchant is absent and amount includes gateway fees', function () {
    Http::fake(['sandbox.ipaymu.com/*' => Http::response(['Status' => 200, 'Data' => $this->detail])]);
    $row = app(IpaymuService::class)->handleCallback(['reference_id' => 'SIP-test', 'sid' => 'session-test', 'trx_id' => '123', 'sub_total' => '25000000', 'amount' => '25450000']);
    expect($row->status)->toBe('paid');
});

it('accepts an authenticated webhook once and rejects invalid signatures without calling the provider', function () {
    $this->withoutMiddleware();
    Queue::fake();
    Http::fake(['sandbox.ipaymu.com/*' => Http::response(['Status' => 200, 'Data' => $this->detail])]);
    $payload = ['reference_id' => 'SIP-test', 'sid' => 'session-test', 'trx_id' => 123, 'sub_total' => '25000000', 'amount' => '25450000', 'additional_info' => []];
    $url = '/api/v1/payment/webhook/ipaymu';
    $this->postJson($url, $payload, ['X-Signature' => str_repeat('0', 64)])->assertUnauthorized();
    Http::assertNothingSent();
    ksort($payload, SORT_STRING);
    $signature = hash_hmac('sha256', json_encode($payload, JSON_THROW_ON_ERROR), 'testVA');
    $this->postJson($url, $payload, ['X-Signature' => $signature])->assertOk();
    Http::assertNothingSent();
    expect($this->row->refresh()->status)->toBe('pending');
    Queue::assertPushed(ProcessIpaymuCallback::class, function ($job) {
        expect($job->connection)->toBe('payment')->and($job->queue)->toBe('callbacks');
        $job->handle(app(IpaymuService::class));

        return true;
    });
    expect($this->row->refresh()->status)->toBe('paid');
    $this->postJson($url, $payload, ['X-Signature' => $signature])->assertOk();
});
