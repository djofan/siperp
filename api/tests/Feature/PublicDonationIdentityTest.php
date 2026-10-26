<?php

use App\Modules\Payment\Models\PaymentDonor;
use App\Modules\Payment\Services\DonorService;
use App\Modules\Payment\Services\TransactionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

it('allows public donations when phone and email belong to different existing donor records', function () {
    DB::table('payment_donors')->insert([
        ['id' => 'phone-owner', 'name' => 'Pemilik Nomor', 'phone' => '628123456789', 'email' => null, 'created_at' => now()],
        ['id' => 'email-owner', 'name' => 'Pemilik Email', 'phone' => null, 'email' => 'donor@example.test', 'created_at' => now()],
    ]);

    $donor = app(DonorService::class)->resolve('Donatur Tamu', '628123456789', 'donor@example.test');

    expect($donor->id)->toBe('phone-owner')
        ->and(PaymentDonor::find('phone-owner')->email)->toBeNull()
        ->and(PaymentDonor::find('email-owner')->phone)->toBeNull();
});

it('creates a donor record directly without requiring registration', function () {
    $donor = app(DonorService::class)->resolve('Donatur Baru', '628987654321', 'baru@example.test');

    expect($donor->name)->toBe('Donatur Baru')
        ->and($donor->phone)->toBe('628987654321')
        ->and($donor->email)->toBe('baru@example.test');
});

it('creates an iPaymu clearing account when no manual destination account exists', function () {
    config([
        'payment.gateway' => 'ipaymu_sandbox',
        'payment.ipaymu.api_key' => 'test-key',
        'payment.ipaymu.va' => 'testVA',
        'payment.ipaymu.base_url' => 'https://sandbox.ipaymu.com/api/v2',
        'payment.public_url' => 'http://localhost:3000',
        'payment.api_url' => 'http://localhost:8000/api/v1',
    ]);
    DB::table('payment_donors')->insert(['id' => 'guest', 'name' => 'Tamu', 'created_at' => now()]);

    $transaction = app(TransactionService::class)->create([
        'moduleSource' => 'lazsip', 'sourceType' => 'campaign', 'sourceId' => 'campaign-test',
        'fundType' => 'infak', 'donorId' => 'guest', 'amount' => 100005, 'adminFee' => 0,
        'paymentMethod' => 'iPaymu Sandbox', 'isAnonymous' => false,
    ]);

    expect($transaction->destinationAccount->bankName)->toBe('iPaymu')
        ->and($transaction->destinationAccount->accountNumber)->toBe('testVA');
});
