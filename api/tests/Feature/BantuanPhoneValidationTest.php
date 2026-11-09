<?php

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function () {
    Storage::fake('local');
    $this->actingAs(bantuanUser('call_center'), 'sanctum');
});

it('rejects invalid applicant and optional reporter telephone numbers even on drafts', function (mixed $number) {
    foreach (['phone', 'reporterPhone'] as $field) {
        foreach ([false, true] as $draft) {
            $input = bantuanInput();
            $input['applicant'][$field] = $number;
            $this->postJson('/api/v1/bantuan/applications', [...$input, 'draft' => $draft])->assertUnprocessable()
                ->assertJsonValidationErrors('applicant.'.$field, 'error.details');
        }
    }
    $this->assertDatabaseCount('bantuan_applications', 0);
})->with(['BUKAN-NOMOR', '0812abc3456', '123', '1234567890123456', '++628123456789', '+08123456789', '0812/3456789', '(021 12345678', 'array' => [['08123456789']]]);

it('accepts local international and formatted telephone numbers without rewriting them', function (string $number) {
    $input = bantuanInput();
    $input['applicant']['phone'] = $number;
    $input['applicant']['reporterPhone'] = $number;
    $id = $this->postJson('/api/v1/bantuan/applications', $input)->assertCreated()->json('data.id');
    $this->getJson('/api/v1/bantuan/applications/'.$id)->assertOk()->assertJsonPath('data.applicant.phone', $number)
        ->assertJsonPath('data.applicant.reporterPhone', $number);
})->with(['08123456789', '+628123456789', '02112345678', '0812-3456-7890', '+62 812 3456 7890', '(021) 12345678']);

it('keeps reporter phone optional and permits a minimal draft without a phone', function () {
    $input = bantuanInput();
    $input['applicant']['reporterPhone'] = null;
    $this->postJson('/api/v1/bantuan/applications', $input)->assertCreated();
    $this->postJson('/api/v1/bantuan/applications', ['draft' => true, 'program' => 'Kesehatan', 'source' => 'online',
        'applicant' => ['name' => 'Draft UAT', 'nik' => '3271051234567899']])->assertCreated();
});
