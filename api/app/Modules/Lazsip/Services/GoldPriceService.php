<?php

namespace App\Modules\Lazsip\Services;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class GoldPriceService
{
    public function quote(): ?array
    {
        $quote = Cache::get('lazsip.gold.quote');
        if ((Cache::get('lazsip.gold.retry_at') ?? 0) > now()->getTimestamp()) {
            return $quote;
        }
        try {
            $gold = Http::timeout(7)->acceptJson()->get('https://api.gold-api.com/price/XAU')->throw()->json();
            $fx = Cache::remember('lazsip.gold.exchange', 3600, function (): array {
                $rates = Http::timeout(7)->acceptJson()->get('https://open.er-api.com/v6/latest/USD')->throw()->json();
                if (($rates['result'] ?? null) !== 'success' || ($rates['base_code'] ?? null) !== 'USD' || ! is_numeric($rates['rates']['IDR'] ?? null) || ! is_numeric($rates['time_last_update_unix'] ?? null)) {
                    throw new \RuntimeException('Invalid exchange rate.');
                }

                return ['rate' => (float) $rates['rates']['IDR'], 'updatedAt' => CarbonImmutable::createFromTimestampUTC($rates['time_last_update_unix'])->toISOString()];
            });
            if (! is_string($gold['updatedAt'] ?? null) || trim($gold['updatedAt']) === '') {
                throw new \RuntimeException('Gold price timestamp is unavailable.');
            }
            $updated = CarbonImmutable::parse($gold['updatedAt']);
            if (($gold['symbol'] ?? null) !== 'XAU' || ($gold['currency'] ?? null) !== 'USD' || ! is_numeric($gold['price'] ?? null) || $gold['price'] <= 0 || $fx['rate'] <= 0 || $updated < now()->subDays(4) || CarbonImmutable::parse($fx['updatedAt']) < now()->subDays(4)) {
                throw new \RuntimeException('Gold price source is unavailable.');
            }
            $quote = ['value' => (int) round($gold['price'] * $fx['rate'] / 31.1034768), 'updatedAt' => $updated->toISOString(), 'exchangeUpdatedAt' => $fx['updatedAt'], 'stale' => false];
        } catch (\Throwable) {
            $quote = $quote && CarbonImmutable::parse($quote['updatedAt']) >= now()->subDays(4) ? [...$quote, 'stale' => true] : null;
        }
        Cache::put('lazsip.gold.quote', $quote, 4 * 86400);
        Cache::put('lazsip.gold.retry_at', now()->getTimestamp() + 60, 60);

        return $quote;
    }
}
