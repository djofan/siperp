<?php

namespace App\Modules\Lazsip\Services;

use App\Contracts\Modules\ModuleContribution;
use App\Modules\Lazsip\Models\LazsipBeneficiary;
use App\Modules\Lazsip\Models\LazsipProgramApplicant;

class LazsipContribution implements ModuleContribution
{
    public function overview(\Carbon\CarbonImmutable $start, \Carbon\CarbonImmutable $end): array
    {
        return ['applications' => LazsipProgramApplicant::whereIn('status', ['baru', 'diproses'])->count(), 'beneficiaryLaz' => LazsipBeneficiary::where('created_at', '>=', $start)->where('created_at', '<', $end)->count()];
    }

    public function contacts(): array
    {
        $rows = [];
        foreach (LazsipProgramApplicant::select('id', 'name', 'contact')->cursor() as $row) $rows[] = ['id' => $row->id, 'name' => $row->name, 'phone' => $row->contact, 'email' => filter_var($row->contact, FILTER_VALIDATE_EMAIL) ? $row->contact : null, 'source' => 'lazsip-pendaftar', 'role' => 'Pendaftar bantuan'];
        foreach (LazsipBeneficiary::select('id', 'name')->cursor() as $row) $rows[] = ['id' => $row->id, 'name' => $row->name, 'phone' => null, 'email' => null, 'source' => 'lazsip-penerima', 'role' => 'Penerima bantuan'];
        return $rows;
    }
}
