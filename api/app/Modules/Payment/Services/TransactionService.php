<?php

namespace App\Modules\Payment\Services;

use App\Modules\Payment\Jobs\DeliverPaymentEmail;
use App\Modules\Payment\Models\PaymentDestinationAccount;
use App\Modules\Payment\Models\PaymentTransaction;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TransactionService
{
    public function create(array $input): PaymentTransaction
    {
        $gateway = config('payment.gateway');
        abort_unless(in_array($gateway, ['simulation', 'ipaymu', 'ipaymu_sandbox'], true), 503, 'Gateway belum dikonfigurasi.');
        $gatewayConfig = null;
        if (in_array($gateway, ['ipaymu', 'ipaymu_sandbox'], true)) {
            $gatewayConfig = app(IpaymuService::class)->configuration();
        }
        $account = $this->destinationAccount($input['moduleSource'], $input['fundType'], $gatewayConfig);
        $input['adminFee'] ??= 0;
        $recent = PaymentTransaction::where('donor_id', $input['donorId'])->where('module_source', $input['moduleSource'])
            ->where('fund_type', $input['fundType'])->where('source_type', $input['sourceType'])
            ->when($input['sourceType'] === 'campaign', fn ($query) => $query->where('source_id', $input['sourceId']))
            ->where('admin_fee', $input['adminFee'])->where('gateway', $gateway)->where('destination_account_id', $account->id)
            ->where('amount', $input['amount'])->where('payment_method', $input['paymentMethod'])->where('status', 'pending')
            ->where('created_at', '>=', now()->subSeconds(5))->orderByDesc('created_at')->lockForUpdate()->first();
        if ($recent) {
            return $recent;
        }
        $row = new PaymentTransaction;
        $row->forceFill([
            ...$input, 'trackingCode' => $this->trackingCode($input['moduleSource']), 'destinationAccountId' => $account->id,
            'isAnonymous' => $input['isAnonymous'] ?? false, 'status' => 'pending', 'gateway' => $gateway,
            'gatewayState' => 'not_started', 'gatewayAccountId' => in_array($gateway, ['ipaymu', 'ipaymu_sandbox'], true) ? config('payment.ipaymu.va') : null,
            'gatewayReferenceId' => in_array($gateway, ['ipaymu', 'ipaymu_sandbox'], true) ? 'SIP-'.Str::uuid() : null,
        ])->save();
        $row->refresh();
        DB::afterCommit(fn () => DeliverPaymentEmail::dispatch($row->id, true));

        return $row;
    }

    private function destinationAccount(string $module, string $fund, ?array $gatewayConfig): PaymentDestinationAccount
    {
        $account = PaymentDestinationAccount::where('module_source', $module)->where('fund_type', $fund)->orderBy('id')->lockForUpdate()->first();
        if ($account || $gatewayConfig === null) {
            abort_unless($account !== null, 503, 'Rekening tujuan belum tersedia.');

            return $account;
        }

        // iPaymu receives the payment through its merchant VA. Keep a clearing
        // account in the ledger so checkout does not depend on a manually entered bank account.
        $id = 'ipaymu-'.substr(hash('sha256', $module.'|'.$fund.'|'.$gatewayConfig['va']), 0, 32);
        DB::table('payment_destination_accounts')->insertOrIgnore([
            'id' => $id,
            'module_source' => $module,
            'fund_type' => $fund,
            'bank_name' => 'iPaymu',
            'account_number' => $gatewayConfig['va'],
            'account_name' => strtoupper($module).' via iPaymu',
        ]);

        return PaymentDestinationAccount::whereKey($id)->lockForUpdate()->firstOrFail();
    }

    public function finalize(string $id, string $status): PaymentTransaction
    {
        abort_unless(in_array($status, ['paid', 'failed'], true), 422);
        $row = DB::transaction(function () use ($id, $status): PaymentTransaction {
            $row = PaymentTransaction::whereKey($id)->lockForUpdate()->firstOrFail();
            if ($row->status === 'pending') {
                $row->status = $status;
                $row->paidAt = $status === 'paid' ? now() : null;
                $row->save();
                if ($status === 'paid') {
                    app(ReceiptService::class)->queue($row);
                }
            }

            return $row;
        }, 5);
        if ($row->status === 'paid') {
            DeliverPaymentEmail::dispatch($row->id);
        }

        return $row;
    }

    public function trackingCode(string $module): string
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $prefix = ['lazsip' => 'LZS', 'sarsip' => 'SRS'][$module] ?? 'TRX';
        for ($attempt = 0; $attempt < 10; $attempt++) {
            $code = $prefix.'-';
            for ($i = 0; $i < 6; $i++) {
                $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }
            if (! PaymentTransaction::where('tracking_code', $code)->exists()) {
                return $code;
            }
        }
        abort(503, 'Kode transaksi belum dapat dibuat.');
    }

    public function publicData(PaymentTransaction $row): array
    {
        return ['id' => $row->id, 'trackingCode' => $row->trackingCode, 'moduleSource' => $row->moduleSource,
            'amount' => $row->amount, 'adminFee' => $row->adminFee, 'paymentMethod' => $row->paymentMethod,
            'status' => $row->status === 'pending' && $row->gatewayState === 'escrow' ? 'escrow' : $row->status, 'gatewayState' => $row->gatewayState, 'createdAt' => $row->createdAt, 'paidAt' => $row->paidAt, 'gateway' => $row->gateway];
    }
}
