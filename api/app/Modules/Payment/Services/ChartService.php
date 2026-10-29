<?php

namespace App\Modules\Payment\Services;

use App\Modules\Payment\Models\PaymentTransaction;
use Carbon\CarbonImmutable;

class ChartService
{
    public function summarize(string $module): array
    {
        $now = CarbonImmutable::now('Asia/Jakarta');
        $since = $now->startOfDay()->subDays(89)->utc();
        $rows = PaymentTransaction::where('module_source', $module)->where(fn ($query) => $query->where('paid_at', '>=', $since)->orWhere(fn ($query) => $query->whereNull('paid_at')->where('created_at', '>=', $since)))->get(['donor_id', 'amount', 'status', 'fund_type', 'created_at', 'paid_at'])
            ->map(fn ($row) => ['donor' => $row->donorId, 'amount' => $row->amount, 'status' => $row->status, 'fund' => $row->fundType, 'date' => $row->paidAt ?? $row->createdAt])->all();
        $adapters = app(\App\Support\PaymentModules::class);
        if ($adapters->has($module)) {
            $rows = [...$rows, ...$adapters->for($module)->legacyChartRows($since)];
        }
        $month = $now->format('Y-m');
        $previous = $now->startOfMonth()->subMonth()->format('Y-m');
        $totals = ['donations' => 0, 'zakat' => 0, 'lastMonthDonations' => 0, 'lastMonthZakat' => 0];
        foreach ($rows as $row) {
            if ($row['status'] !== 'paid' || $row['date'] > $now) {
                continue;
            }
            $key = $row['date']->setTimezone('Asia/Jakarta')->format('Y-m');
            if ($key === $month) {
                $totals[$row['fund'] === 'zakat' ? 'zakat' : 'donations'] += $row['amount'];
            }
            if ($key === $previous) {
                $totals[$row['fund'] === 'zakat' ? 'lastMonthZakat' : 'lastMonthDonations'] += $row['amount'];
            }
        }

        return ['totals' => $totals, 'periods' => array_map(fn ($days) => $this->period($rows, $days, $now), [7, 30, 90])];
    }

    public function period(array $rows, int $days, CarbonImmutable $now): array
    {
        $daily = [];
        for ($offset = $days - 1; $offset >= 0; $offset--) {
            $key = $now->startOfDay()->subDays($offset)->format('Y-m-d');
            $daily[$key] = ['date' => $key, 'amount' => 0, 'donors' => 0, 'transactions' => 0];
        }
        $donorsByDay = [];
        $donors = [];
        $statuses = ['paid' => 0, 'pending' => 0, 'failed' => 0];
        $funds = ['zakat' => 0, 'donation' => 0];
        foreach ($rows as $row) {
            $key = $row['date']->setTimezone('Asia/Jakarta')->format('Y-m-d');
            if (! isset($daily[$key]) || $row['date'] > $now) {
                continue;
            }
            if (array_key_exists($row['status'], $statuses)) {
                $statuses[$row['status']]++;
            }
            if ($row['status'] !== 'paid') {
                continue;
            }
            $daily[$key]['amount'] += $row['amount'];
            $daily[$key]['transactions']++;
            $donorsByDay[$key][$row['donor']] = true;
            $daily[$key]['donors'] = count($donorsByDay[$key]);
            $donors[$row['donor']] = true;
            $funds[$row['fund'] === 'zakat' ? 'zakat' : 'donation'] += $row['amount'];
        }

        return ['days' => $days, 'daily' => array_values($daily), 'statuses' => $statuses, 'funds' => $funds, 'amount' => array_sum($funds), 'donors' => count($donors), 'transactions' => $statuses['paid']];
    }
}
