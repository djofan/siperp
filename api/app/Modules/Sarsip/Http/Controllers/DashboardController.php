<?php

namespace App\Modules\Sarsip\Http\Controllers;

use App\Modules\Payment\Models\PaymentTransaction;
use App\Modules\Sarsip\Models\SarsipBeneficiary;
use App\Modules\Sarsip\Models\SarsipEntry;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController
{
    public function __invoke(Request $request): JsonResponse
    {
        $request->validate(['limit' => 'sometimes|integer|min:1|max:100', 'days' => 'sometimes|integer|min:1|max:365']);
        $limit = $request->integer('limit', 5);
        $days = $request->integer('days', 7);
        $query = PaymentTransaction::where('module_source', 'sarsip');
        $paid = (clone $query)->where('status', 'paid');
        $start = CarbonImmutable::now('Asia/Jakarta')->startOfMonth()->utc();
        $previous = $start->setTimezone('Asia/Jakarta')->subMonth()->utc();
        $top = SarsipEntry::where('kind', 'campaign')->where('status', 'published')->orderByDesc('created_at')->limit($limit)->get()
            ->map(fn ($row) => ['id' => $row->id, 'title' => $row->title, 'targetAmount' => $row->targetAmount, 'currentAmount' => (int) (clone $paid)->where('source_type', 'campaign')->where('source_id', $row->id)->sum('amount')])
            ->sortByDesc('currentAmount')->values();
        $recent = (clone $query)->with('donor:id,name')->orderByDesc('created_at')->limit($limit)->get()->map(fn ($row) => ['id' => $row->id, 'label' => 'Donasi — '.$row->sourceType, 'donorName' => $row->donor->name, 'amount' => $row->amount, 'status' => $row->status, 'createdAt' => $row->createdAt]);
        $today = CarbonImmutable::now('UTC')->startOfDay();
        $daily = [];
        for ($offset = $days - 1; $offset >= 0; $offset--) {
            $daily[$today->subDays($offset)->format('Y-m-d')] = 0;
        }
        foreach ((clone $paid)->where('created_at', '>=', $today->subDays($days - 1))->get(['amount', 'created_at']) as $row) {
            $key = $row->createdAt->format('Y-m-d');
            if (array_key_exists($key, $daily)) {
                $daily[$key] += $row->amount;
            }
        }

        return response()->json(['data' => [
            'counts' => ['activeActivities' => SarsipEntry::where('kind', 'kegiatan')->whereIn('status', ['published', 'completed'])->count(), 'openCampaigns' => SarsipEntry::where('kind', 'campaign')->where('status', 'published')->count(), 'totalBeneficiaries' => SarsipBeneficiary::whereNull('archived_at')->count(), 'pendingTransactions' => (clone $query)->where('status', 'pending')->count(), 'totalDonors' => (clone $paid)->distinct()->count('donor_id')],
            'totals' => ['donations' => (int) (clone $paid)->where('created_at', '>=', $start)->sum('amount'), 'lastMonthDonations' => (int) (clone $paid)->where('created_at', '>=', $previous)->where('created_at', '<', $start)->sum('amount')],
            'top' => $top, 'recent' => $recent, 'daily' => collect($daily)->map(fn ($total, $date) => ['date' => $date, 'total' => $total])->values(),
        ]]);
    }
}
