<?php

use App\Modules\Bantuan\Services\SurveyGeocoder;
use App\Modules\Bantuan\Services\SurveyRouter;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    config(['bantuan.location_provider' => 'geoapify', 'bantuan.geoapify_api_key' => 'test-key', 'cache.default' => 'array']);
    Cache::flush();
});

it('preserves full addresses and flags street matches for confirmation with cached results', function () {
    Http::fake(['*' => Http::response(['results' => [
        ['lat' => -6.4, 'lon' => 106.9, 'formatted' => 'Jalan Swadaya 3, Mekarsari', 'result_type' => 'street', 'rank' => ['confidence' => 1]],
        ['lat' => 999, 'lon' => 106, 'formatted' => 'Invalid'],
    ]])]);
    $address = 'Jl. Swadaya 3, RT.05/RW.11, Mekarsari, Cimanggis, Depok 16452';
    $service = app(SurveyGeocoder::class);
    expect($service->search($address))->toHaveCount(1)->and($service->search($address)[0]['approximate'])->toBeTrue();
    Http::assertSentCount(1);
    Http::assertSent(fn ($request) => $request['text'] === $address && $request['filter'] === 'countrycode:id');
});

it('converts Geoapify road geometry into the existing map contract', function () {
    $line = [[106.9, -6.4], [106.8, -6.5]];
    Http::fake(['*' => Http::response(['features' => [['geometry' => ['type' => 'MultiLineString', 'coordinates' => [$line]], 'properties' => ['distance' => 1234, 'time' => 120]]]])]);
    $service = app(SurveyRouter::class);
    $a = ['latitude' => -6.4, 'longitude' => 106.9]; $b = ['latitude' => -6.5, 'longitude' => 106.8];
    expect($service->route($a, $b))->toBe(['coordinates' => $line, 'distance' => 1234.0, 'duration' => 120.0]);
    $service->route($a, $b);
    Http::assertSentCount(1);
    Http::assertSent(fn ($request) => $request['waypoints'] === '-6.4,106.9|-6.5,106.8' && $request['mode'] === 'drive');
});

it('does not send requests when the key is missing', function () {
    config(['bantuan.geoapify_api_key' => '']); Http::fake();
    try { app(SurveyGeocoder::class)->search('Bogor'); $this->fail('Expected unavailable service'); }
    catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) { expect($e->getStatusCode())->toBe(503); }
    Http::assertNothingSent();
});

it('returns quota errors without leaking the upstream response or key', function () {
    Http::fake(['*' => Http::response(['message' => 'test-key'], 429)]);
    try { app(SurveyGeocoder::class)->search('Bogor'); $this->fail('Expected quota error'); }
    catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) { expect($e->getStatusCode())->toBe(429)->and($e->getMessage())->not->toContain('test-key'); }
});

it('rejects disconnected route legs instead of inventing a connecting line', function () {
    Http::fake(['*' => Http::response(['features' => [['geometry' => ['type' => 'MultiLineString', 'coordinates' => [[[106, -6], [107, -7]], [[108, -8], [109, -9]]]], 'properties' => ['distance' => 10, 'time' => 20]]]])]);
    try { app(SurveyRouter::class)->route(['latitude' => -6, 'longitude' => 106], ['latitude' => -9, 'longitude' => 109]); $this->fail('Expected invalid geometry'); }
    catch (\Symfony\Component\HttpKernel\Exception\HttpException $e) { expect($e->getStatusCode())->toBe(503); }
});
