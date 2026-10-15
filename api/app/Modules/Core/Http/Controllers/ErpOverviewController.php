<?php

namespace App\Modules\Core\Http\Controllers;

use App\Modules\Academy\Models\AcademyDiscussion;
use App\Modules\Academy\Models\ZakatAcademyCourse;
use App\Modules\Academy\Models\ZakatAcademyEnrollment;
use App\Modules\Academy\Services\AcademyDto;
use App\Modules\Core\Models\CoreBankLine;
use App\Modules\Core\Models\CoreContact;
use App\Modules\Core\Models\CoreExpense;
use App\Modules\Lazsip\Models\LazsipBeneficiary;
use App\Modules\Lazsip\Models\LazsipProgramApplicant;
use App\Modules\Payment\Models\PaymentTransaction;
use App\Modules\Sarsip\Models\SarsipBeneficiary;
use Illuminate\Http\Request;

class ErpOverviewController
{
    public function __invoke(Request $request, ErpFinanceController $finance)
    {
        [$start, $end] = $finance->period($request);
        $paid = PaymentTransaction::where('status', 'paid')->whereNotIn('gateway', ['simulation', 'midtrans_sandbox'])->where('paid_at', '>=', $start)->where('paid_at', '<', $end);
        $income = (clone $paid)->select('module_source', 'fund_type')->selectRaw('SUM(amount) AS amount, SUM(admin_fee) AS fees, COUNT(*) AS total')->groupBy('module_source', 'fund_type')->get()->map(fn ($r) => ['moduleSource' => $r->moduleSource, 'fundType' => $r->fundType, '_sum' => ['amount' => (int) $r->amount, 'adminFee' => (int) $r->fees], '_count' => (int) $r->total]);
        $expense = CoreExpense::where('spent_at', '>=', $start)->where('spent_at', '<', $end);

        return response()->json(['data' => [
            'income' => $income, 'expenses' => ['_sum' => ['amount' => (int) (clone $expense)->sum('amount')], '_count' => $expense->count()],
            'pending' => PaymentTransaction::where('status', 'pending')->whereNotIn('gateway', ['simulation', 'midtrans_sandbox'])->count(),
            'applications' => LazsipProgramApplicant::whereIn('status', ['baru', 'diproses'])->count(),
            'courses' => ZakatAcademyCourse::where('is_simulation', false)->withCount('enrollments')->orderByDesc('created_at')->take(8)->get()->map(fn ($r) => AcademyDto::make($r)),
            'enrollments' => ZakatAcademyEnrollment::whereHas('course', fn ($q) => $q->where('is_simulation', false))->count(),
            'unanswered' => AcademyDiscussion::whereNull('answer')->whereHas('course', fn ($q) => $q->where('is_simulation', false))->count(),
            'unmatched' => CoreBankLine::whereNull('payment_id')->whereNull('expense_id')->count(),
            'beneficiaryLaz' => LazsipBeneficiary::where('created_at', '>=', $start)->where('created_at', '<', $end)->count(),
            'beneficiarySar' => SarsipBeneficiary::whereNull('archived_at')->where('received_at', '>=', $start)->where('received_at', '<', $end)->count(),
            'contacts' => CoreContact::count(), 'recent' => $paid->select('id', 'tracking_code', 'amount', 'module_source', 'fund_type', 'paid_at')->orderByDesc('paid_at')->take(6)->get(),
        ]]);
    }
}
