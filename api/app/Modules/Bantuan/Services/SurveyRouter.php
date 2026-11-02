<?php

namespace App\Modules\Bantuan\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;

class SurveyRouter
{
    public function route(array $origin, array $destination): array
    {
        if (config('bantuan.location_provider') === 'geoapify') return app(GeoapifyLocation::class)->route($origin, $destination);
        $coordinates = implode(';', array_map(fn ($point) => round($point['longitude'], 6).','.round($point['latitude'], 6), [$origin, $destination]));
        $endpoint = rtrim(config('bantuan.router_url'), '/');
        $key = 'bantuan:route:'.hash('sha256', $endpoint.$coordinates);
        if ($cached = Cache::get($key)) return json_decode(Crypt::decryptString($cached), true);
        $lock = Cache::lock('bantuan:route:outbound', 20);
        abort_unless($lock->get(), 429, 'Layanan rute sedang digunakan. Coba lagi sebentar.');
        try {
            $wait = (float) Cache::get('bantuan:route:next', 0) - microtime(true);
            if ($wait > 0) usleep((int) (min($wait, 1.1) * 1000000));
            $response = Http::connectTimeout(5)->timeout(12)->withUserAgent('LAZSIP-Survey/1.0')->get($endpoint.'/'.$coordinates, ['overview' => 'full', 'geometries' => 'geojson', 'steps' => 'false']);
            $route = $response->json('routes.0');
            abort_unless($response->successful() && $response->json('code') === 'Ok' && is_array($route), 503, 'Rute jalan belum tersedia. Coba lagi atau buka Google Maps.');
            $line = $route['geometry']['coordinates'] ?? [];
            abort_unless(count($line) >= 2 && count($line) <= 100000 && ($route['geometry']['type'] ?? '') === 'LineString' && is_numeric($route['distance'] ?? null) && is_numeric($route['duration'] ?? null), 503, 'Data rute belum lengkap.');
            foreach ($line as $point) abort_unless(is_array($point) && count($point) >= 2 && is_numeric($point[0]) && is_numeric($point[1]) && abs($point[0]) <= 180 && abs($point[1]) <= 90, 503, 'Data rute tidak valid.');
            $result = ['coordinates' => $line, 'distance' => max(0, (float) $route['distance']), 'duration' => max(0, (float) $route['duration'])];
            Cache::put($key, Crypt::encryptString(json_encode($result)), now()->addHours(6));
            return $result;
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            abort(503, 'Layanan rute belum dapat dihubungi. Coba lagi atau buka Google Maps.');
        } finally {
            Cache::put('bantuan:route:next', microtime(true) + 1.05, 3);
            $lock->release();
        }
    }
}
