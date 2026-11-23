<?php

use App\Modules\Lazsip\Models\LazsipCampaign;
use App\Modules\Lazsip\Services\LazsipPaymentModule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

it('allows absent campaign codes while validating configured codes and preserving update omission', function () {
    $this->withoutMiddleware();
    $url='/api/v1/lazsip/campaigns';
    $input=['title'=>'Campaign uji','description'=>'Pengujian kode opsional','isPinned'=>false,'status'=>'active'];
    foreach ([[], ['uniqueCode'=>null], ['uniqueCode'=>''], ['uniqueCode'=>'  ']] as $optional) {
        $id=$this->postJson($url,[...$input,...$optional])->assertCreated()->json('id');
        expect(LazsipCampaign::findOrFail($id)->uniqueCode)->toBeNull();
        $this->getJson($url.'/'.$id)->assertOk()->assertJsonPath('data.uniqueCode','');
    }
    $id=$this->postJson($url,[...$input,'uniqueCode'=>'07'])->assertCreated()->json('id');
    $this->postJson($url,[...$input,'uniqueCode'=>'07'])->assertUnprocessable();
    foreach (['7','007','aa',7] as $invalid) {
        $this->postJson($url,[...$input,'uniqueCode'=>$invalid])->assertUnprocessable();
        $this->putJson($url.'/'.$id,[...$input,'uniqueCode'=>$invalid])->assertUnprocessable();
    }
    $this->putJson($url.'/'.$id,$input)->assertOk();
    expect(LazsipCampaign::findOrFail($id)->uniqueCode)->toBe('07');
    $this->putJson($url.'/'.$id,[...$input,'uniqueCode'=>''])->assertOk();
    expect(LazsipCampaign::findOrFail($id)->uniqueCode)->toBeNull();
    $this->putJson($url.'/'.$id,[...$input,'uniqueCode'=>'08'])->assertOk();
    $this->putJson($url.'/'.$id,[...$input,'uniqueCode'=>null])->assertOk();
    expect(LazsipCampaign::findOrFail($id)->uniqueCode)->toBeNull();
});

it('keeps uncoded donation amounts unchanged while preserving coded checkout behavior', function () {
    $this->withoutMiddleware();
    $module = app(LazsipPaymentModule::class);
    foreach ([[null, 12345], ['', 12345], ['07', 12407], ['00', 12400]] as [$code, $expected]) {
        $campaign = new LazsipCampaign;
        $campaign->forceFill(['title' => 'Checkout uji', 'description' => 'Uji', 'targetAmount' => 0, 'currentAmount' => 0, 'uniqueCode' => $code, 'isPinned' => false, 'status' => 'active'])->save();
        $prepared = $module->prepare(['sourceType' => 'campaign', 'sourceId' => $campaign->id, 'fundType' => 'infak', 'amount' => 12345, 'uniqueCode' => null]);
        expect($prepared['amount'])->toBe($expected);
        $this->getJson('/api/v1/lazsip/campaigns/'.$campaign->id)->assertOk()->assertJsonPath('data.uniqueCode', $code ?? '');
    }
});

it('expands the schema without rewriting existing codes or removing uniqueness', function () {
    $campaign = new LazsipCampaign;
    $campaign->forceFill(['title' => 'Existing campaign', 'description' => 'Preserve', 'targetAmount' => 0, 'currentAmount' => 0, 'uniqueCode' => '07', 'isPinned' => false, 'status' => 'active'])->save();
    $migration = require database_path('migrations/2026_11_23_000001_make_lazsip_campaign_unique_code_optional.php');
    $migration->down();
    $migration->up();
    expect($campaign->refresh()->uniqueCode)->toBe('07');
    $indexes = Schema::getIndexes('lazsip_campaigns');
    expect(collect($indexes)->contains(fn ($index) => $index['unique'] && $index['columns'] === ['unique_code']))->toBeTrue();
    $campaign->forceFill(['uniqueCode' => null])->save();
    expect(fn () => $migration->down())->toThrow(RuntimeException::class);
    expect($campaign->refresh()->uniqueCode)->toBeNull();
});
