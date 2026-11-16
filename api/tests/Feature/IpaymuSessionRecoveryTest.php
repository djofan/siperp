<?php

use App\Modules\Payment\Models\PaymentTransaction;
use App\Modules\Payment\Services\IpaymuService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpKernel\Exception\HttpException;

uses(RefreshDatabase::class);

beforeEach(function () {
    config(['payment.gateway' => 'ipaymu', 'payment.ipaymu.api_key' => 'test-key', 'payment.ipaymu.va' => 'testVA',
        'payment.ipaymu.base_url' => 'https://my.ipaymu.com/api/v2', 'payment.public_url' => 'https://erp.example.test', 'payment.api_url' => 'https://erp.example.test/api/v1']);
    Storage::fake('local');
    Http::preventStrayRequests();
    DB::table('payment_donors')->insert(['id' => 'recovery-donor', 'name' => 'PRIVATE_DONOR']);
    DB::table('payment_destination_accounts')->insert(['id' => 'recovery-account', 'module_source' => 'lazsip', 'fund_type' => 'infak', 'bank_name' => 'Test', 'account_number' => '123', 'account_name' => 'Test']);
    $this->row = new PaymentTransaction;
    $this->row->forceFill(['id' => 'recovery-test', 'trackingCode' => 'LZS-RECOVERY', 'moduleSource' => 'lazsip', 'sourceType' => 'campaign',
        'sourceId' => '', 'fundType' => 'infak', 'donorId' => 'recovery-donor', 'destinationAccountId' => 'recovery-account', 'amount' => 10007, 'paymentMethod' => 'iPaymu',
        'gateway' => 'ipaymu', 'gatewayState' => 'needs_review', 'gatewayAccountId' => 'testVA', 'gatewayReferenceId' => 'recovery-reference'])->save();
    $this->path = 'payment/ipaymu-session-evidence/'.hash('sha256', $this->row->id).'.enc';
    $this->evidence = ['transactionId' => $this->row->id, 'gateway' => 'ipaymu', 'referenceId' => 'recovery-reference', 'accountId' => 'testVA',
        'status' => 200, 'sessionId' => 'PRIVATE_SESSION', 'url' => 'https://payment.ipaymu.com/#PRIVATE_SESSION'];
});

it('preserves rejected session evidence privately and recovers it without a second checkout', function () {
    Http::fake(['*/payment' => Http::response(['Status' => 200, 'Data' => ['SessionID' => 'PRIVATE_SESSION', 'Url' => $this->evidence['url']]])]);
    // Reproduce a historical allowlist rejection while recording the provider response.
    $oldValidator = new class extends IpaymuService
    {
        public function safeUrl(?string $url): bool
        {
            return false;
        }
    };
    expect(fn () => $oldValidator->createSession($this->row))->toThrow(RuntimeException::class);
    $encrypted = Storage::disk('local')->get($this->path);
    expect($encrypted)->not->toContain('PRIVATE_SESSION', 'PRIVATE_DONOR', 'test-key')
        ->and(json_decode(Crypt::decryptString($encrypted), true))->toBe($this->evidence);

    $gateway = app(IpaymuService::class);
    expect($gateway->recoverCheckoutSession($this->row))->toBe('EVIDENCE_VALID')
        ->and($this->row->refresh()->gatewayState)->toBe('needs_review');
    expect($gateway->recoverCheckoutSession($this->row, true))->toBe('SESSION_RECOVERED')
        ->and($this->row->refresh()->gatewaySessionId)->toBe('PRIVATE_SESSION')
        ->and($this->row->gatewayState)->toBe('ready')->and($this->row->status)->toBe('pending');
    Http::assertSentCount(1);
});

it('does not unlock uncertain sessions when evidence is missing', function () {
    expect(Artisan::call('payment:ipaymu-recover-session', ['transactionId' => $this->row->id, '--apply' => true]))->toBe(1)
        ->and(Artisan::output())->toContain('NO_EVIDENCE')
        ->and($this->row->refresh()->gatewayState)->toBe('needs_review');
    Http::assertNothingSent();
});

it('rejects recovery with mismatched or unsafe evidence', function ($field, $value) {
    $evidence = array_replace($this->evidence, [$field => $value]);
    Storage::disk('local')->put($this->path, Crypt::encryptString(json_encode($evidence)));
    expect(Artisan::call('payment:ipaymu-recover-session', ['transactionId' => $this->row->id, '--apply' => true]))->toBe(1)
        ->and($this->row->refresh()->gatewayState)->toBe('needs_review')
        ->and(Artisan::output())->not->toContain('PRIVATE_SESSION');
    Http::assertNothingSent();
})->with([['referenceId', 'wrong'], ['accountId', 'wrong'], ['gateway', 'ipaymu_sandbox'],
    ['transactionId', 'other'], ['url', 'https://evil.test/#PRIVATE_SESSION'], ['status', 401], ['sessionId', '']]);

it('does not overwrite a paid or concurrently recovered transaction', function () {
    Storage::disk('local')->put($this->path, Crypt::encryptString(json_encode($this->evidence)));
    $stale = clone $this->row;
    $this->row->forceFill(['status' => 'paid'])->save();
    expect(fn () => app(IpaymuService::class)->recoverCheckoutSession($stale, true))->toThrow(HttpException::class);
    expect($this->row->refresh()->status)->toBe('paid')->and($this->row->gatewayState)->toBe('needs_review');
    Http::assertNothingSent();
});
