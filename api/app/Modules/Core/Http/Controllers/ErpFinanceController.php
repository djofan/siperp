<?php

namespace App\Modules\Core\Http\Controllers;

use App\Modules\Core\Models\AccessLog;
use App\Modules\Core\Models\CoreBankLine as BankLine;
use App\Modules\Core\Models\CoreExpense as Expense;
use App\Modules\Payment\Models\PaymentDestinationAccount as Account;
use App\Modules\Payment\Models\PaymentTransaction as Payment;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ErpFinanceController
{
    private function log(Request $request, string $message): void
    {
        $row = new AccessLog;
        $row->message = $request->user()->name.' '.$message;
        $row->save();
    }

    private function data(array $data)
    {
        return response()->json(['data' => $data]);
    }

    public function period(Request $request): array
    {
        $request->validate(['from' => 'nullable|date_format:Y-m-d', 'to' => 'nullable|date_format:Y-m-d']);
        $start = CarbonImmutable::createFromFormat('!Y-m-d', $request->input('from') ?: now('Asia/Jakarta')->startOfMonth()->format('Y-m-d'), 'Asia/Jakarta')->utc();
        $end = CarbonImmutable::createFromFormat('!Y-m-d', $request->input('to') ?: now('Asia/Jakarta')->format('Y-m-d'), 'Asia/Jakarta')->addDay()->utc();
        abort_if($end <= $start, 422, 'Rentang tanggal tidak valid.');

        return [$start, $end];
    }

    private function paid()
    {
        return Payment::where('status', 'paid')->whereNotIn('gateway', ['simulation', 'midtrans_sandbox']);
    }

    public function index(Request $request)
    {
        [$start, $end] = $this->period($request);
        $accountId = $request->input('account');
        $page = max(1, min(100000, (int) $request->input('page', 1)));
        $accounts = Account::orderBy('module_source')->orderBy('fund_type')->get();
        $payments = $this->paid()->where('paid_at', '>=', $start)->where('paid_at', '<', $end)->when($accountId, fn ($q) => $q->where('destination_account_id', $accountId));
        $expenses = Expense::where('spent_at', '>=', $start)->where('spent_at', '<', $end)->when($accountId, fn ($q) => $q->where('account_id', $accountId));
        $lineQuery = BankLine::where('booked_at', '>=', $start)->where('booked_at', '<', $end)->when($accountId, fn ($q) => $q->where('account_id', $accountId));
        if ($request->input('status') === 'unmatched') {
            $lineQuery->whereNull('payment_id')->whereNull('expense_id');
        }
        $count = (clone $lineQuery)->count();
        $lines = $lineQuery->orderByDesc('booked_at')->orderBy('id')->skip(($page - 1) * 20)->take(20)->get();
        $income = (clone $payments)->select('destination_account_id')->selectRaw('SUM(amount) AS amount, SUM(admin_fee) AS fees')->groupBy('destination_account_id')->get()->keyBy('destinationAccountId');
        $sums = (clone $expenses)->select('account_id')->selectRaw('SUM(amount) AS amount')->groupBy('account_id')->get()->keyBy('accountId');
        $summary = $accounts->filter(fn ($a) => ! $accountId || $a->id === $accountId)->values()->map(fn ($a) => ['account' => $a, 'income' => (int) ($income[$a->id]->amount ?? 0), 'fees' => (int) ($income[$a->id]->fees ?? 0), 'expense' => (int) ($sums[$a->id]->amount ?? 0)]);
        $candidates = [];
        $expenseCandidates = [];
        foreach ($lines as $line) {
            if ($line->direction === 'masuk' && ! $line->paymentId) {
                $rows = $this->paid()->where('destination_account_id', $line->accountId)->whereRaw('amount + admin_fee = ?', [$line->amount])->whereNotIn('id', BankLine::whereNotNull('payment_id')->select('payment_id'))->select('id', 'tracking_code', 'amount', 'admin_fee', 'destination_account_id', 'paid_at')->orderBy('paid_at')->take(100)->get();
                foreach ($rows as $row) {
                    $candidates[$row->id] = $row;
                }
            } elseif ($line->direction === 'keluar' && ! $line->expenseId) {
                $rows = Expense::where('account_id', $line->accountId)->where('amount', $line->amount)->whereNotIn('id', BankLine::whereNotNull('expense_id')->select('expense_id'))->take(100)->get();
                foreach ($rows as $row) {
                    $expenseCandidates[$row->id] = $row;
                }
            }
        }

        return $this->data(['accounts' => $accounts, 'summary' => $summary, 'lines' => $lines, 'count' => $count, 'expenses' => $expenses->orderByDesc('spent_at')->take(30)->get(), 'payments' => array_values($candidates), 'candidatesExpenses' => array_values($expenseCandidates)]);
    }

    public function expense(Request $request)
    {
        $data = $request->validate(['accountId' => 'required|string', 'reference' => 'required|string|max:191', 'description' => 'required|string|min:3|max:2000', 'amount' => 'required|integer|min:1|max:2147483647', 'spentAt' => 'required|date_format:Y-m-d']);
        DB::transaction(function () use ($request, $data) {
            $account = Account::findOrFail($data['accountId']);
            $row = new Expense;
            foreach (['accountId', 'reference', 'description', 'amount'] as $key) {
                $row->$key = $data[$key];
            } $row->spentAt = CarbonImmutable::createFromFormat('!Y-m-d', $data['spentAt'], 'Asia/Jakarta')->utc();
            $row->moduleSource = $account->moduleSource;
            $row->fundType = $account->fundType;
            $row->createdBy = $request->user()->id;
            $row->save();
            $this->log($request, 'mencatat pengeluaran '.$row->reference.' sebesar Rp'.$row->amount.'.');
        });

        return $this->data(['message' => 'Pengeluaran disimpan.']);
    }

    public function import(Request $request)
    {
        $data = $request->validate(['accountId' => 'required|string', 'file' => 'required|file|max:1024']);
        Account::findOrFail($data['accountId']);
        $stream = fopen($request->file('file')->getRealPath(), 'rb');
        $header = fgetcsv($stream, null, ',', '"', '');
        $header = array_map(fn ($v) => strtolower(trim(preg_replace('/^\xEF\xBB\xBF/', '', $v))), $header ?: []);
        abort_unless($header === ['tanggal', 'referensi', 'keterangan', 'arah', 'nominal'], 422, 'Header CSV: tanggal,referensi,keterangan,arah,nominal.');
        $rows = [];
        while (($line = fgetcsv($stream, null, ',', '"', '')) !== false) {
            if (! array_filter($line, fn ($v) => trim((string) $v) !== '')) {
                continue;
            }
            abort_unless(count($line) === 5, 422, 'Baris CSV tidak valid.');
            $row = ['bookedAt' => trim($line[0]), 'reference' => trim($line[1]), 'description' => trim($line[2]), 'direction' => strtolower(trim($line[3])), 'amount' => trim($line[4])];
            validator($row, ['bookedAt' => 'required|date_format:Y-m-d', 'reference' => 'required|string|max:191', 'description' => 'nullable|string|max:2000', 'direction' => 'required|in:masuk,keluar', 'amount' => 'required|integer|min:1|max:2147483647'])->validate();
            $row['bookedAt'] = CarbonImmutable::createFromFormat('!Y-m-d', $row['bookedAt'], 'Asia/Jakarta')->utc();
            $row['amount'] = (int) $row['amount'];
            $timestamp = $row['bookedAt']->format('Y-m-d\TH:i:s.v\Z');
            $row['fingerprint'] = hash('sha256', json_encode([$data['accountId'], $timestamp, $row['reference'], $row['direction'], $row['amount']], JSON_UNESCAPED_SLASHES));
            $rows[] = $row;
            abort_if(count($rows) > 1000, 422, 'Impor maksimal 1.000 baris.');
        } fclose($stream);
        abort_if(! count($rows), 422, 'CSV tidak memiliki baris mutasi.');
        $count = DB::transaction(function () use ($rows, $data, $request) {
            Account::where('id', $data['accountId'])->lockForUpdate()->firstOrFail();
            $count = 0;
            foreach ($rows as $values) {
                if (BankLine::where('fingerprint', $values['fingerprint'])->exists()) {
                    continue;
                } $row = new BankLine;
                foreach ($values as $key => $value) {
                    $row->$key = $value;
                } $row->accountId = $data['accountId'];
                $row->save();
                $count++;
            } $this->log($request, 'mengimpor '.$count.' mutasi bank.');

            return $count;
        }, 3);

        return $this->data(['message' => $count.' mutasi baru diimpor; '.(count($rows) - $count).' duplikat dilewati.']);
    }

    public function match(Request $request)
    {
        $data = $request->validate(['lineId' => 'required|string', 'entryId' => 'required|string', 'note' => 'required|string|min:3|max:2000']);
        DB::transaction(function () use ($data, $request) {
            $line = BankLine::where('id', $data['lineId'])->lockForUpdate()->firstOrFail();
            abort_if($line->paymentId || $line->expenseId, 409, 'Mutasi sudah dicocokkan.');
            if ($line->direction === 'masuk') {
                $payment = $this->paid()->where('id', $data['entryId'])->lockForUpdate()->firstOrFail();
                abort_unless($payment->destinationAccountId === $line->accountId && $payment->amount + $payment->adminFee === $line->amount, 422, 'Rekening dan nominal termasuk biaya admin harus cocok.');
                abort_if(BankLine::where('payment_id', $payment->id)->exists(), 409, 'Transaksi sudah digunakan.');
                $line->paymentId = $payment->id;
            } else {
                $expense = Expense::where('id', $data['entryId'])->lockForUpdate()->firstOrFail();
                abort_unless($expense->accountId === $line->accountId && $expense->amount === $line->amount, 422, 'Rekening dan nominal harus cocok.');
                abort_if(BankLine::where('expense_id', $expense->id)->exists(), 409, 'Pengeluaran sudah digunakan.');
                $line->expenseId = $expense->id;
            }
            $line->matchedBy = $request->user()->id;
            $line->matchedAt = now();
            $line->matchNote = $data['note'];
            $line->save();
            $this->log($request, 'mencocokkan mutasi '.$line->reference.' dengan '.$data['entryId'].'.');
        }, 3);

        return $this->data(['message' => 'Mutasi berhasil dicocokkan.']);
    }

    public function unmatch(Request $request)
    {
        $data = $request->validate(['lineId' => 'required|string', 'note' => 'required|string|min:3|max:2000']);
        DB::transaction(function () use ($data, $request) {
            $line = BankLine::where('id', $data['lineId'])->lockForUpdate()->firstOrFail();
            abort_unless($line->paymentId || $line->expenseId, 409, 'Mutasi belum dicocokkan.');
            $line->paymentId = null;
            $line->expenseId = null;
            $line->matchNote = 'Pembatalan: '.$data['note'];
            $line->matchedBy = null;
            $line->matchedAt = null;
            $line->save();
            $this->log($request, 'membatalkan rekonsiliasi '.$line->reference.': '.$data['note']);
        }, 3);

        return $this->data(['message' => 'Pencocokan dibatalkan.']);
    }

    public function export(Request $request)
    {
        $type = $request->validate(['type' => 'required|in:bank-template,finance'])['type'];
        if ($type === 'bank-template') {
            $rows = [['tanggal', 'referensi', 'keterangan', 'arah', 'nominal'], ['2026-10-02', 'BANK-001', 'Contoh penerimaan', 'masuk', 100000]];
        } else {
            [$start, $end] = $this->period($request);
            $account = $request->input('account');
            $payments = $this->paid()->where('paid_at', '>=', $start)->where('paid_at', '<', $end)->when($account, fn ($q) => $q->where('destination_account_id', $account))->with('destinationAccount')->take(10001)->get();
            $expenses = Expense::where('spent_at', '>=', $start)->where('spent_at', '<', $end)->when($account, fn ($q) => $q->where('account_id', $account))->take(10001)->get();
            abort_if($payments->count() > 10000 || $expenses->count() > 10000, 422, 'Persempit periode ekspor; maksimal 10.000 baris per jenis.');
            $accounts = Account::all()->keyBy('id');
            $rows = [['tanggal', 'referensi', 'modul', 'dana', 'rekening', 'arah', 'nominal_dana', 'biaya_admin', 'total']];
            foreach ($payments as $p) {
                $rows[] = [$p->paidAt->setTimezone('Asia/Jakarta')->format('Y-m-d'), $p->trackingCode, $p->moduleSource, $p->fundType, $p->destinationAccount->accountNumber, 'masuk', $p->amount, $p->adminFee, $p->amount + $p->adminFee];
            }
            foreach ($expenses as $e) {
                $rows[] = [$e->spentAt->setTimezone('Asia/Jakarta')->format('Y-m-d'), $e->reference, $e->moduleSource, $e->fundType, $accounts[$e->accountId]->accountNumber ?? '', 'keluar', $e->amount, 0, $e->amount];
            }
        }

        return response()->streamDownload(function () use ($rows) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            foreach ($rows as $row) {
                fputcsv($out, array_map(fn ($v) => preg_match('/^\s*[=+\-@]/', (string) $v) ? "'".$v : $v, $row), ',', '"', '');
            } fclose($out);
        }, $type === 'finance' ? 'laporan-keuangan.csv' : 'template-mutasi.csv', ['Content-Type' => 'text/csv; charset=utf-8', 'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
    }
}
