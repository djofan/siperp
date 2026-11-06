<?php

namespace App\Modules\Bantuan\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Http;

class SurveyGeocoder
{
    public function search(string $address): array
    {
        if (config('bantuan.location_provider') === 'geoapify') return app(GeoapifyLocation::class)->search($address);
        $clean = preg_replace('/\bRT\.?\s*\d+\s*\/\s*RW\.?\s*\d+\b|\b(?:RT|RW)\.?\s*\d+\b|\b\d{5}\b/iu', '', $address);
        $clean = preg_replace('/\b(?:Kec\.|Kecamatan|Kab\.|Kabupaten|Perumahan)\s*/iu', '', $clean);
        $clean = preg_replace('/\bJl\.?\s+/iu', 'Jalan ', $clean);
        $clean = implode(', ', array_filter(array_map(fn ($part) => trim($part, " \t\n\r\0\x0B."), explode(',', $clean))));
        $parts = array_map('trim', explode(',', $clean));
        $streetIndex = null;
        foreach ($parts as $index => $part) if (preg_match('/\bJalan\b/iu', $part)) { $streetIndex = $index; break; }
        $street = $streetIndex !== null ? implode(', ', array_slice($parts, $streetIndex)) : $clean;
        $area = $streetIndex !== null && count($parts) > $streetIndex + 1 ? implode(', ', array_slice($parts, $streetIndex + 1)) : (count($parts) > 2 ? implode(', ', array_slice($parts, -3)) : $clean);
        // Match the reference's structured street/postcode search after trying the full address.
        $first = trim(explode(',', $address)[0]);
        $simple = preg_replace('/\s*\b(?:r[tw]\.?\s*\d+|no(?:\.\s*|\s+)[\da-z]+|nomor\s+\d+|blok\b|gg\.?\s|gang\b|kel\.?\s|kec\.?\s).*$/iu', '', $first);
        $simple = trim(preg_replace('/^Jl\.?\s+/iu', 'Jalan ', $simple), " ,;.");
        preg_match('/\b(\d{5})\b/u', $address, $postcode);
        $queries = [['params' => ['q' => $clean], 'approximate' => false]];
        if (mb_strlen($simple) >= 3) {
            if (isset($postcode[1])) $queries[] = ['params' => ['street' => $simple, 'country' => 'Indonesia', 'postalcode' => $postcode[1]], 'approximate' => true];
            $queries[] = ['params' => ['street' => $simple, 'country' => 'Indonesia'], 'approximate' => true];
            $queries[] = ['params' => ['q' => $simple.', Indonesia'], 'approximate' => true];
        }
        foreach (array_unique(array_filter([$street, $area])) as $query) {
            if ($query !== $clean) $queries[] = ['params' => ['q' => $query], 'approximate' => true];
        }
        foreach ($queries as $query) {
            $results = $this->lookup($query['params']);
            if ($results) return array_map(fn ($place) => [...$place, 'approximate' => $query['approximate']], $results);
        }
        return [];
    }

    private function lookup(array $params): array
    {
        $endpoint = config('bantuan.geocoder_url', 'https://nominatim.openstreetmap.org/search');
        $key = 'bantuan:geocode:'.hash('sha256', $endpoint.'|v2|'.json_encode($params));
        if ($cached = Cache::get($key)) return json_decode(Crypt::decryptString($cached), true);
        // One outbound search at a time across all users, including a cooldown.
        $lock = Cache::lock('bantuan:geocode:outbound', 20);
        abort_unless($lock->get(), 429, 'Pencarian lokasi sedang digunakan. Coba lagi sebentar.');
        try {
            $wait = (float) Cache::get('bantuan:geocode:next', 0) - microtime(true);
            if ($wait > 0) usleep((int) (min($wait, 1.1) * 1000000));
            $response = Http::connectTimeout(5)->timeout(12)->withHeaders([
                'User-Agent' => 'LAZSIP-Survey/1.0 (+'.config('app.url').')',
                'Accept-Language' => 'id',
            ])->get($endpoint, [...$params, 'format' => 'jsonv2', 'limit' => 5, 'countrycodes' => 'id']);
            abort_unless($response->successful() && is_array($response->json()), 503, 'Layanan pencarian alamat belum tersedia. Silakan coba lagi.');
            $results = [];
            foreach ($response->json() as $place) {
                if (!is_array($place) || !is_numeric($place['lat'] ?? null) || !is_numeric($place['lon'] ?? null)) continue;
                $lat = (float) $place['lat']; $lng = (float) $place['lon'];
                if (abs($lat) > 90 || abs($lng) > 180) continue;
                $results[] = ['latitude' => $lat, 'longitude' => $lng, 'label' => (string) ($place['display_name'] ?? $params['q'] ?? $params['street'] ?? '')];
            }
            Cache::put($key, Crypt::encryptString(json_encode($results)), now()->addDays(30));
            return $results;
        } catch (\Illuminate\Http\Client\ConnectionException $e) {
            abort(503, 'Pencarian alamat terlalu lama. Silakan coba lagi.');
        } finally {
            Cache::put('bantuan:geocode:next', microtime(true) + 1.05, 3);
            $lock->release();
        }
    }
}
