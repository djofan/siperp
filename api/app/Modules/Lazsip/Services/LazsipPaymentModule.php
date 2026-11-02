<?php

namespace App\Modules\Lazsip\Services;

use App\Contracts\Payments\PaymentModule;
use App\Modules\Lazsip\Models\LazsipCampaign;
use App\Modules\Lazsip\Models\LazsipPaymentFeeRef;
use App\Modules\Lazsip\Models\LazsipZakatDetail;
use App\Modules\Lazsip\Models\LazsipDonation;
use App\Modules\Lazsip\Models\LazsipZakatPayment;

class LazsipPaymentModule implements PaymentModule
{
    public function prepare(array $input): array
    {
        $source = $input['sourceType'];
        abort_unless(in_array($source, ['campaign', 'zakat'], true), 422);
        $fund = $source === 'zakat' ? 'zakat' : 'infak';
        abort_unless($input['fundType'] === $fund, 422);
        $amount = $input['amount'];
        $sourceId = $input['sourceId'] ?? null;
        if ($source === 'campaign') {
            $campaign = LazsipCampaign::where('status', 'active')->lockForUpdate()->find($sourceId);
            abort_unless($campaign, 404, 'Campaign tidak ditemukan atau sudah selesai.');
            abort_unless(preg_match('/^\d{2}$/D', $campaign->uniqueCode), 503);
            $amount = (int) (ceil($amount / 100) * 100 + (int) $campaign->uniqueCode);
        } else {
            $detail = new LazsipZakatDetail;
            $detail->forceFill(['zakatType' => $input['zakatType'], 'goldPriceSnapshot' => $input['zakatType'] === 'maal' ? ($input['goldPriceSnapshot'] ?? 0) : null, 'jiwaCount' => $input['zakatType'] === 'fitrah' ? ($input['jiwaCount'] ?? null) : null])->save();
            $sourceId = $detail->id;
        }
        return compact('amount', 'sourceId', 'fund');
    }

    public function paymentMethod(string $name): ?array
    {
        $row = LazsipPaymentFeeRef::where('method', $name)->first();
        return $row ? ['method' => $row->method, 'feeAmount' => $row->feeAmount, 'feePercentage' => $row->feePercentage] : null;
    }

    public function describe(string $sourceType, string $sourceId): array
    {
        $label = $sourceType === 'zakat' ? (LazsipZakatDetail::find($sourceId)?->zakatType === 'fitrah' ? 'Zakat Fitrah' : 'Zakat Maal') : (LazsipCampaign::whereKey($sourceId)->value('title') ?? 'Donasi LAZSIP');
        return ['brand' => 'LAZSIP', 'label' => $label, 'message' => $sourceType === 'zakat' ? 'Terima kasih telah menunaikan zakat melalui LAZSIP. Semoga Allah menerima zakat Anda dan memberikan keberkahan.' : 'Terima kasih telah berbagi melalui LAZSIP. Dukungan Anda berarti bagi penerima manfaat campaign ini.'];
    }

    public function legacyChartRows(\Carbon\CarbonImmutable $since): array
    {
        $rows = [];
        foreach ([LazsipDonation::class => 'infak', LazsipZakatPayment::class => 'zakat'] as $model => $fund) {
            foreach ($model::where('created_at', '>=', $since)->get(['donor_id', 'amount', 'status', 'created_at']) as $row) {
                $rows[] = ['donor' => $row->donorId, 'amount' => $row->amount, 'status' => $row->status, 'fund' => $fund, 'date' => $row->createdAt];
            }
        }
        return $rows;
    }

    public function discardUnusedSource(string $sourceType, string $sourceId): void
    {
        if ($sourceType === 'zakat') LazsipZakatDetail::whereKey($sourceId)->delete();
    }
}
