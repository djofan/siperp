<?php

use App\Modules\Lazsip\Services\HistoryEmailService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;

uses(RefreshDatabase::class);

it('formats history as an escaped email table with plain text and transaction codes', function () {
    $content = app(HistoryEmailService::class)->content([
        ['createdAt' => '2026-09-28T08:00:00Z', 'type' => 'donasi', 'label' => '<script>Test</script>', 'amount' => 250000, 'status' => 'paid', 'trackingCode' => 'LZS-NP245U'],
        ['createdAt' => '2026-09-24T08:00:00Z', 'type' => 'zakat', 'label' => 'Zakat Maal', 'amount' => 225000000, 'status' => 'pending', 'trackingCode' => 'LZS-TEST'],
    ]);
    expect($content['html'])->toContain('<table', '&lt;script&gt;', 'Rp250.000', 'Lunas', 'LZS-NP245U', 'Rp225.000.000', 'Menunggu pembayaran')->not->toContain('<script>');
    expect($content['text'])->toContain("Assalamu'alaikum", "Tanggal\tJenis\tNominal\tStatus\tKode", 'Donasi —', 'Zakat — Zakat Maal');
});

it('emails history without exposing donor existence or transactions in the response and throttles retries', function () {
    $this->withoutMiddleware();
    config(['payment.resend.key' => 'test-key', 'payment.resend.from' => 'test@example.org', 'cache.default' => 'array']);
    Http::fake(['api.resend.com/*' => Http::response(['id' => 'test-email'], 200)]);
    $url = '/api/v1/lazsip/transactions/history';
    $response = $this->postJson($url, ['action' => 'email', 'email' => 'unknown@example.org'])->assertOk();
    expect($response->json())->not->toHaveKeys(['items', 'challengeId', 'found']);
    Http::assertSent(fn ($request) => $request['to'] === 'unknown@example.org' && str_contains($request['html'], 'Belum ada transaksi') && isset($request['text']));
    $this->postJson($url, ['action' => 'email', 'email' => 'unknown@example.org'])->assertStatus(429);
    Http::assertSentCount(1);
});

it('returns readable service errors and rejects invalid email', function () {
    $this->withoutMiddleware();
    config(['payment.resend.key' => null, 'payment.resend.from' => null, 'cache.default' => 'array']);
    Http::fake();
    $url = '/api/v1/lazsip/transactions/history';
    $this->postJson($url, ['action' => 'email', 'email' => 'valid@example.org'])->assertStatus(503)->assertJsonPath('error.message', 'Layanan email belum dikonfigurasi. Silakan hubungi admin.');
    $this->postJson($url, ['action' => 'email', 'email' => 'invalid'])->assertStatus(422);
    Http::assertNothingSent();
});

it('does not report success when the email provider rejects a request', function () {
    $this->withoutMiddleware();
    config(['payment.resend.key' => 'test-key', 'payment.resend.from' => 'test@example.org', 'cache.default' => 'array']);
    Http::fake(['api.resend.com/*' => Http::response(['message' => 'Restricted sender'], 403)]);
    $this->postJson('/api/v1/lazsip/transactions/history', ['action' => 'email', 'email' => 'reject@example.org'])->assertStatus(503);
});
