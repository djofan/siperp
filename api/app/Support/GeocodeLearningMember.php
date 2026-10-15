<?php

namespace App\Support;

use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class GeocodeLearningMember implements ShouldQueue
{
    use Queueable;

    public function __construct(public string $module, public string $memberId) {}

    public function handle(): void
    {
        if (! in_array($this->module, ['tanwir', 'ojol'], true)) {
            return;
        }
        $name = ucfirst($this->module);
        $model = 'App\\Modules\\'.$name.'\\Models\\'.$name.'Member';
        $member = $model::find($this->memberId);
        if (! $member?->provinceName) {
            return;
        }
        $parts = [$member->villageName, $member->districtName, $member->cityName, $member->provinceName];
        $queries = [];
        for ($skip = 0; $skip < 4; $skip++) {
            $queries[] = implode(', ', array_filter(array_slice($parts, $skip)));
        }
        foreach (array_unique($queries) as $query) {
            if (! $query) {
                continue;
            }
            try {
                $point = Cache::remember('learning.geocode.'.hash('sha256', $query), 30 * 86400, function () use ($query) {
                    // Shared lock and pacing honor the upstream one-request-per-second limit.
                    return Cache::lock('learning.geocode.lock', 20)->block(20, function () use ($query) {
                        $wait = (Cache::get('learning.geocode.next') ?? 0) - microtime(true);
                        if ($wait > 0) {
                            usleep((int) ceil($wait * 1000000));
                        }
                        Cache::put('learning.geocode.next', microtime(true) + 1.1, 60);
                        $data = Http::timeout(10)->withHeaders(['User-Agent' => 'PlatformSIP-Learning/1.0 (insanpeduli.org)'])->get('https://nominatim.openstreetmap.org/search', ['q' => $query.', Indonesia', 'format' => 'json', 'limit' => 1, 'countrycodes' => 'id'])->throw()->json();
                        $row = $data[0] ?? null;
                        if (! $row || ! is_numeric($row['lat'] ?? null) || ! is_numeric($row['lon'] ?? null)) {
                            return null;
                        }
                        $lat = (float) $row['lat'];
                        $lng = (float) $row['lon'];
                        if (! is_finite($lat) || ! is_finite($lng) || abs($lat) > 90 || abs($lng) > 180) {
                            return null;
                        }

                        return ['latitude' => $lat, 'longitude' => $lng];
                    });
                });
                if ($point) {
                    // Do not overwrite a newer address that was saved while the job ran.
                    $model::whereKey($member->id)->where('province_id', $member->provinceId)->where('village_id', $member->villageId)->update($point);

                    return;
                }
            } catch (\Throwable) { /* A missing point must not block profile changes. */
            }
        }
    }
}
