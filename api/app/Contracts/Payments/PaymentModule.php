<?php

namespace App\Contracts\Payments;

interface PaymentModule
{
    /** Validate module-owned source and return scalar checkout data only. */
    public function prepare(array $input): array;

    public function paymentMethod(string $name): ?array;

    public function describe(string $sourceType, string $sourceId): array;

    public function legacyChartRows(\Carbon\CarbonImmutable $since): array;

    public function discardUnusedSource(string $sourceType, string $sourceId): void;
}
