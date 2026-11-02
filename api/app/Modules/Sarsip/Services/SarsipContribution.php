<?php

namespace App\Modules\Sarsip\Services;

use App\Contracts\Modules\ModuleContribution;
use App\Modules\Sarsip\Models\SarsipBeneficiary;

class SarsipContribution implements ModuleContribution
{
    public function overview(\Carbon\CarbonImmutable $start, \Carbon\CarbonImmutable $end): array
    {
        return ['beneficiarySar' => SarsipBeneficiary::whereNull('archived_at')->where('received_at', '>=', $start)->where('received_at', '<', $end)->count()];
    }

    public function contacts(): array
    {
        return SarsipBeneficiary::whereNull('archived_at')->select('id', 'name', 'phone')->get()->map(fn ($row) => ['id' => $row->id, 'name' => $row->name, 'phone' => $row->phone, 'email' => null, 'source' => 'sarsip', 'role' => 'Penerima bantuan'])->all();
    }
}
