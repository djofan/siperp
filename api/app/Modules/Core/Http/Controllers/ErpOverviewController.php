<?php

namespace App\Modules\Core\Http\Controllers;

use App\Modules\Core\Models\CoreBankLine;
use App\Modules\Core\Models\CoreContact;
use App\Modules\Core\Models\CoreExpense;
use App\Modules\Payment\Models\PaymentTransaction;
use Illuminate\Http\Request;

class ErpOverviewController
{
    public function __invoke(Request $request, ErpFinanceController $finance)
    {
        [$start, $end] = $finance->period($request);
        $paid = PaymentTransaction::where('status', 'paid')->whereNotIn('gateway', ['simulation', 'ipaymu_sandbox'])->where('paid_at', '>=', $start)->where('paid_at', '<', $end);
        $income = (clone $paid)->select('module_source', 'fund_type')->selectRaw('SUM(amount) AS amount, SUM(admin_fee) AS fees, COUNT(*) AS total')->groupBy('module_source', 'fund_type')->get()->map(fn ($r) => ['moduleSource' => $r->moduleSource, 'fundType' => $r->fundType, '_sum' => ['amount' => (int) $r->amount, 'adminFee' => (int) $r->fees], '_count' => (int) $r->total]);
        $expense = CoreExpense::where('spent_at', '>=', $start)->where('spent_at', '<', $end);

        return response()->json(['data' => [
            ...app(\App\Support\ModuleContributions::class)->overview($start, $end),
            'income' => $income, 'expenses' => ['_sum' => ['amount' => (int) (clone $expense)->sum('amount')], '_count' => $expense->count()],
            'pending' => PaymentTransaction::where('status', 'pending')->whereNotIn('gateway', ['simulation', 'ipaymu_sandbox'])->count(),
            'unmatched' => CoreBankLine::whereNull('payment_id')->whereNull('expense_id')->count(),
            'contacts' => CoreContact::count(), 'recent' => $paid->select('id', 'tracking_code', 'amount', 'module_source', 'fund_type', 'paid_at')->orderByDesc('paid_at')->take(6)->get(),
        ]]);
    }
}
