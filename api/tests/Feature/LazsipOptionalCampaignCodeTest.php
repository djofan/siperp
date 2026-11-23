<?php

use App\Modules\Lazsip\Models\LazsipCampaign;
use App\Modules\Lazsip\Services\LazsipPaymentModule;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('supports multiple campaigns without codes and preserves or clears existing codes explicitly', function () {
    $this->withoutMiddleware();
    $url = '/api/v1/lazsip/campaigns';
    $input = ['title' => 'Campaign uji', 'description' => 'Pengujian kode opsional', 'isPinned' => false, 'status' => 'active'];
    foreach ([[], ['uniqueCode' => null], ['uniqueCode' => '']] as $optional) {
        $id = $this->postJson($url, [...$input, ...$optional])->assertCreated()->json('id');
        $this->assertDatabaseHas('lazsip_campaigns', ['id' => $id, 'unique_code' => null]);
        $this->getJson($url.'/'.$id)->assertOk()->assertJsonPath('data.uniqueCode', '');
    }
    $id = $this->postJson($url, [...$input, 'uniqueCode' => '07'])->assertCreated()->json('id');
    $this->postJson($url, [...$input, 'uniqueCode' => '07'])->assertUnprocessable();
    $this->putJson($url.'/'.$id, $input)->assertOk();
    $this->getJson($url.'/'.$id)->assertJsonPath('data.uniqueCode', '07');
    $this->putJson($url.'/'.$id, [...$input, 'uniqueCode' => null])->assertOk();
    $this->getJson($url.'/'.$id)->assertJsonPath('data.uniqueCode', '');
    $this->postJson($url, [...$input, 'uniqueCode' => '07'])->assertCreated();
    foreach (['7', '007', 'aa', 7] as $invalid) {
        $this->putJson($url.'/'.$id, [...$input, 'uniqueCode' => $invalid])->assertUnprocessable();
    }
});

it('keeps uncoded donation amounts unchanged while preserving coded checkout behavior', function () {
    $module = app(LazsipPaymentModule::class);
    foreach ([[null, 12345], ['', 12345], ['07', 12407], ['00', 12400]] as [$code, $expected]) {
        $campaign = new LazsipCampaign;
        $campaign->forceFill(['title' => 'Checkout uji', 'description' => 'Uji', 'targetAmount' => 0, 'currentAmount' => 0, 'uniqueCode' => $code, 'isPinned' => false, 'status' => 'active'])->save();
        $prepared = $module->prepare(['sourceType' => 'campaign', 'sourceId' => $campaign->id, 'fundType' => 'infak', 'amount' => 12345, 'uniqueCode' => null]);
        expect($prepared['amount'])->toBe($expected);
    }
});
