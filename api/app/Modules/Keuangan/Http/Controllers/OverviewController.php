<?php

namespace App\Modules\Keuangan\Http\Controllers;

use App\Modules\Keuangan\Http\Resources\OverviewResource;
use App\Modules\Keuangan\Services\KeuanganAccess;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OverviewController
{
    public function __invoke(Request $request, KeuanganAccess $access): OverviewResource
    {
        $context = $access->context($request);
        // Even administrators only receive their own approval task count.
        $pending = $context['canReadApprovals']
            ? DB::table('keuangan_approvals')->where('assigned_user_id', $request->user()->id)->where('decision', 'waiting')->whereNull('cancelled_at')->whereExists(fn ($q) => $q->selectRaw('1')->from('keuangan_expenses as e')->whereColumn('e.id', 'keuangan_approvals.expense_id')->whereColumn('e.revision', 'keuangan_approvals.revision')->whereNull('e.archived_at'))->count()
            : null;

        return new OverviewResource([
            ...$context,
            'expenses' => DB::table('keuangan_expenses')->whereNull('archived_at')->count(),
            'sources' => $context['canReadMasters'] ? DB::table('keuangan_sources')->whereNull('archived_at')->count() : null,
            'categories' => $context['canReadMasters'] ? DB::table('keuangan_categories')->whereNull('archived_at')->count() : null,
            'myPendingApprovals' => $pending,
        ]);
    }
}
