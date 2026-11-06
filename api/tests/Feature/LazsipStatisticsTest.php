<?php

use App\Modules\Core\Http\Middleware\RequirePublicModule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->withoutMiddleware(RequirePublicModule::class);
});

it('returns zero statistics for an empty database regardless of old manual content', function () {
    DB::table('lazsip_site_content')->insert([
        'id' => 'manual', 'section_key' => 'transparansi',
        'content_json' => json_encode(['totalDana' => '999999999', 'totalDonatur' => '99', 'totalPenerima' => '99']),
    ]);
    $this->getJson('/api/v1/lazsip/statistics')->assertOk()->assertExactJson(['data' => [
        'totalDana' => 0, 'totalDonatur' => 0, 'totalPenerima' => 0, 'totalMitra' => 0,
    ]]);
});

it('aggregates only LAZSIP paid funds, unique donors, partners and recorded beneficiaries', function () {
    foreach (['a', 'b', 'pending', 'other'] as $id) {
        DB::table('payment_donors')->insert(['id' => $id, 'name' => 'Private donor '.$id]);
    }
    DB::table('lazsip_campaigns')->insert([
        'id' => 'campaign', 'title' => 'Campaign', 'description' => 'Test', 'target_amount' => 9999999, 'unique_code' => 'test',
    ]);
    DB::table('payment_destination_accounts')->insert([
        'id' => 'account', 'module_source' => 'lazsip', 'fund_type' => 'infak',
        'bank_name' => 'Test', 'account_number' => '123', 'account_name' => 'Test',
    ]);
    DB::table('lazsip_donations')->insert([
        'id' => 'legacy', 'campaign_id' => 'campaign', 'donor_id' => 'a', 'amount' => 100000,
        'admin_fee' => 5000, 'payment_method' => 'test', 'status' => 'paid',
    ]);
    DB::table('lazsip_zakat_payments')->insert([
        'id' => 'legacy-zakat', 'donor_id' => 'b', 'amount' => 200000, 'payment_method' => 'test', 'status' => 'paid',
    ]);
    foreach ([
        ['new', 'a', 'campaign', 'lazsip', 'paid', 300000],
        ['new-zakat', 'a', 'zakat', 'lazsip', 'paid', 400000],
        ['pending-payment', 'pending', 'campaign', 'lazsip', 'pending', 900000],
        ['failed-payment', 'pending', 'campaign', 'lazsip', 'failed', 800000],
        ['other-module', 'other', 'campaign', 'sarsip', 'paid', 700000],
    ] as [$id, $donor, $source, $module, $status, $amount]) {
        DB::table('payment_transactions')->insert([
            'id' => $id, 'tracking_code' => $id, 'donor_id' => $donor, 'source_type' => $source,
            'source_id' => 'campaign', 'module_source' => $module, 'status' => $status,
            'fund_type' => 'infak', 'amount' => $amount, 'admin_fee' => 10000,
            'payment_method' => 'test', 'destination_account_id' => 'account',
        ]);
    }
    foreach ([50000, -10000] as $index => $amount) {
        DB::table('lazsip_campaign_adjustments')->insert([
            'id' => 'adjustment-'.$index, 'campaign_id' => 'campaign', 'amount' => $amount, 'note' => 'Test',
        ]);
    }
    DB::table('lazsip_partners')->insert([['id' => 'one', 'name' => 'One'], ['id' => 'two', 'name' => 'Two']]);
    foreach ([' Ahmad ', 'ahmad', 'Budi', '   '] as $index => $verifier) {
        DB::table('lazsip_beneficiaries')->insert([
            'id' => 'beneficiary-'.$index, 'name' => 'Private beneficiary', 'address' => 'Private address',
            'problem_faced' => 'Test', 'birth_date' => '1990-01-01', 'age' => 36, 'gender' => 'perempuan',
            'referral_source' => 'Relawan', 'needs' => 'Test', 'aid_type' => 'pendidikan', 'amount_received' => 100000,
            'verifier_name' => $verifier, 'verifier_area' => 'Bogor', 'marital_status' => 'menikah',
        ]);
    }

    $expected = ['totalDana' => 1040000, 'totalDonatur' => 2, 'totalPenerima' => 4, 'totalMitra' => 2];
    $this->getJson('/api/v1/lazsip/statistics')->assertOk()->assertExactJson(['data' => $expected]);
    $this->getJson('/api/v1/lazsip/totals')->assertOk()->assertExactJson(['data' => ['donations' => 400000, 'zakat' => 600000]]);

    DB::table('payment_transactions')->where('id', 'pending-payment')->update(['status' => 'paid']);
    $this->getJson('/api/v1/lazsip/statistics')->assertOk()->assertExactJson(['data' => [
        ...$expected, 'totalDana' => 1940000, 'totalDonatur' => 3,
    ]]);
});
