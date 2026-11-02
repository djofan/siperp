<?php

namespace App\Modules\Bantuan\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;

class GeoapifyLocation
{
    public function search(string $address): array
    {
        $data = $this->request('geocode/search', ['text' => trim($address), 'format' => 'json', 'filter' => 'countrycode:id', 'limit' => 5], 86400);
        abort_unless(is_array($data['results'] ?? null), 503, 'Data pencarian alamat belum tersedia.');
        $results = [];
        foreach ($data['results'] as $place) {
            if (!is_array($place) || !$this->validPoint([$place['lon'] ?? null, $place['lat'] ?? null])) continue;
            $results[] = [
                'latitude' => (float) $place['lat'], 'longitude' => (float) $place['lon'],
                'label' => (string) ($place['formatted'] ?? $address),
                'approximate' => !in_array($place['result_type'] ?? '', ['building', 'amenity'], true) || (float) ($place['rank']['confidence'] ?? 0) < 0.95,
            ];
        }
        return $results;
    }

    public function route(array $origin, array $destination): array
    {
        $waypoints = implode('|', array_map(fn ($point) => round($point['latitude'], 6).','.round($point['longitude'], 6), [$origin, $destination]));
        $data = $this->request('routing', ['waypoints' => $waypoints, 'mode' => 'drive', 'units' => 'metric'], 21600);
        $feature = $data['features'][0] ?? [];
        $geometry = $feature['geometry'] ?? [];
        // Two waypoints form one leg. Never join disconnected geometry into a fabricated road.
        $lines = $geometry['coordinates'] ?? [];
        abort_unless(($geometry['type'] ?? '') === 'MultiLineString' && is_array($lines) && count($lines) === 1, 503, 'Rute jalan belum tersedia. Coba lagi atau buka Google Maps.');
        $line = $lines[0];
        $properties = $feature['properties'] ?? [];
        abort_unless(is_array($line) && count($line) >= 2 && count($line) <= 100000 && is_numeric($properties['distance'] ?? null) && is_numeric($properties['time'] ?? null), 503, 'Data rute belum lengkap.');
        foreach ($line as $point) abort_unless($this->validPoint($point), 503, 'Data rute tidak valid.');
        abort_unless($properties['distance'] >= 0 && $properties['time'] >= 0, 503, 'Data rute tidak valid.');
        return ['coordinates' => $line, 'distance' => (float) $properties['distance'], 'duration' => (float) $properties['time']];
    }

    private function validPoint(mixed $point): bool
    {
        return is_array($point) && count($point) >= 2 && is_numeric($point[0]) && is_numeric($point[1]) && abs((float) $point[0]) <= 180 && abs((float) $point[1]) <= 90;
    }

    private function request(string $path, array $params, int $ttl): array
    {
        $apiKey = config('bantuan.geoapify_api_key');
        abort_unless(is_string($apiKey) && trim($apiKey) !== '', 503, 'Layanan lokasi belum dikonfigurasi. Hubungi admin.');
        $cacheKey = 'bantuan:geoapify:v1:'.hash('sha256', $path.json_encode($params));
        if ($cached = Cache::get($cacheKey)) return json_decode(Crypt::decryptString($cached), true);
        $lock = Cache::lock('bantuan:geoapify:outbound', 25);
        abort_unless($lock->get(), 429, 'Layanan lokasi sedang digunakan. Coba lagi sebentar.');
        try {
            $wait = (float) Cache::get('bantuan:geoapify:next', 0) - microtime(true);
            if ($wait > 0) usleep((int) (min($wait, 0.25) * 1000000));
            $response = Http::connectTimeout(5)->timeout(15)->acceptJson()->get('https://api.geoapify.com/v1/'.$path, [...$params, 'apiKey' => $apiKey]);
            abort_if($response->status() === 429, 429, 'Batas layanan lokasi tercapai. Coba lagi nanti.');
            abort_unless($response->successful() && is_array($response->json()), 503, 'Layanan lokasi belum dapat memproses permintaan. Silakan coba lagi atau hubungi admin.');
            $data = $response->json();
            Cache::put($cacheKey, Crypt::encryptString(json_encode($data)), $ttl);
            return $data;
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            abort(503, 'Layanan lokasi terlalu lama merespons. Silakan coba lagi.');
        } finally {
            Cache::put('bantuan:geoapify:next', microtime(true) + 0.25, 2);
            $lock->release();
        }
    }
}
