<?php

namespace App\Modules\Sarsip\Services;

use App\Contracts\Payments\PaymentModule;
use App\Modules\Sarsip\Models\SarsipEntry;
use App\Modules\Sarsip\Models\SarsipPaymentMethod;

class SarsipPaymentModule implements PaymentModule
{
    public function prepare(array $input): array
    {
        abort_unless($input['sourceType'] === 'campaign' && $input['fundType'] === 'donasi', 422);
        abort_unless(! empty($input['donorPhone']), 422, 'Masukkan nomor WhatsApp yang valid.');
        $campaign = SarsipEntry::where('kind', 'campaign')->where('status', 'published')->lockForUpdate()->find($input['sourceId']);
        abort_unless($campaign, 404, 'Campaign tidak ditemukan atau sudah selesai.');
        return ['amount' => $input['amount'], 'sourceId' => $campaign->id, 'fund' => 'donasi'];
    }

    public function paymentMethod(string $name): ?array
    {
        $row = SarsipPaymentMethod::where('method', $name)->first();
        return $row ? ['method' => $row->method, 'feeAmount' => $row->feeAmount, 'feePercentage' => $row->feePercentage] : null;
    }

    public function describe(string $sourceType, string $sourceId): array
    {
        return ['brand' => 'SARSIP', 'label' => SarsipEntry::whereKey($sourceId)->value('title') ?? 'Donasi SARSIP', 'message' => 'Terima kasih atas dukungan Anda untuk misi pencarian, pertolongan, dan kemanusiaan SARSIP.'];
    }

    public function legacyChartRows(\Carbon\CarbonImmutable $since): array { return []; }
    public function discardUnusedSource(string $sourceType, string $sourceId): void {}
}
