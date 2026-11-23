<?php

use App\Modules\Lazsip\Models\LazsipCampaign;
use App\Modules\Lazsip\Services\LazsipPaymentModule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;

uses(RefreshDatabase::class);

it('requires two digit unique codes while old payment releases may still serve requests', function () {
    $this->withoutMiddleware();
    $url = '/api/v1/lazsip/campaigns';
    $input = ['title' => 'Campaign uji', 'description' => 'Pengujian kode opsional', 'isPinned' => false, 'status' => 'active'];
    foreach ([[], ['uniqueCode' => null], ['uniqueCode' => ''], ['uniqueCode' => '  ']] as $optional) {
        $this->postJson($url, [...$input, ...$optional])->assertUnprocessable();
    }
    $this->assertDatabaseCount('lazsip_campaigns', 0);
    $id = $this->postJson($url, [...$input, 'uniqueCode' => '07'])->assertCreated()->json('id');
    $this->postJson($url, [...$input, 'uniqueCode' => '07'])->assertUnprocessable();
    foreach ([[], ['uniqueCode' => null], ['uniqueCode' => ''], ['uniqueCode' => '  ']] as $optional) {
        $this->putJson($url.'/'.$id, [...$input, 'title' => 'Must not change', ...$optional])->assertUnprocessable();
        $this->assertDatabaseHas('lazsip_campaigns', ['id' => $id, 'title' => $input['title'], 'unique_code' => '07']);
    }
    foreach (['7', '007', 'aa', 7] as $invalid) {
        $this->postJson($url, [...$input, 'uniqueCode' => $invalid])->assertUnprocessable();
        $this->putJson($url.'/'.$id, [...$input, 'uniqueCode' => $invalid])->assertUnprocessable();
    }
    $this->putJson($url.'/'.$id, [...$input, 'uniqueCode' => '08'])->assertOk();
    $this->getJson($url.'/'.$id)->assertOk()->assertJsonPath('data.uniqueCode', '08');
    $this->postJson($url, [...$input, 'uniqueCode' => '08'])->assertUnprocessable();
    // The previous release's payment algorithm accepts every code emitted by these writes.
    $code = LazsipCampaign::findOrFail($id)->uniqueCode;
    expect(preg_match('/^\d{2}$/D', $code))->toBe(1);
    $expected = (int) (ceil(12345 / 100) * 100 + (int) $code);
    expect(app(LazsipPaymentModule::class)->prepare(['sourceType' => 'campaign', 'sourceId' => $id, 'fundType' => 'infak', 'amount' => 12345])['amount'])->toBe($expected);
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
