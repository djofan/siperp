<?php

namespace App\Modules\Lazsip\Http\Controllers;

use App\Modules\Lazsip\Models\{LazsipDonation, LazsipZakatPayment, LazsipZakatDetail};
use App\Modules\Payment\Models\PaymentTransaction;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\{DB, Log};

class DeleteTestTransactionController
{
    public function __invoke(Request $request, string $source, string $id)
    {
        abort_unless($request->user()?->is_superadmin || $request->attributes->get('module_role') === 'admin', 403);
        abort_unless(in_array($source, ['payment', 'legacy-donation', 'zakat'], true), 404);
        $data = $request->validate(['confirmationCode' => 'required|string|max:191', 'testTransaction' => 'required|accepted']);
        DB::transaction(function () use ($request, $source, $id, $data) {
            $query = match ($source) {
                'payment' => PaymentTransaction::where('module_source', 'lazsip'),
                'legacy-donation' => LazsipDonation::query(),
                'zakat' => LazsipZakatPayment::query(),
            };
            $row = $query->whereKey($id)->lockForUpdate()->firstOrFail();
            $code = $source === 'payment' ? $row->trackingCode : $row->id;
            abort_unless(hash_equals((string) $code, trim($data['confirmationCode'])), 422, 'Kode transaksi tidak sesuai.');
            // A reconciled bank movement must be unmatched in Core before its test ledger entry is removed.
            abort_if(DB::table('core_bank_lines')->where('payment_id', $id)->exists(), 409, 'Transaksi terhubung ke rekonsiliasi bank. Lepaskan pencocokan di Core terlebih dahulu.');
            if ($source === 'payment') {
                abort_if($row->gatewayState === 'creating', 409, 'Sesi pembayaran sedang dibuat. Tunggu hingga proses selesai.');
                $receipt = DB::table('payment_receipts')->where('transaction_id', $id)->lockForUpdate()->first();
                abort_if($receipt && $receipt->status === 'sending', 409, 'Email transaksi sedang dikirim. Coba lagi setelah proses selesai.');
                DB::table('payment_receipts')->where('transaction_id', $id)->delete();
            }
            $snapshot = ['actor_id' => $request->user()->id, 'transaction_id' => $id, 'source' => $source, 'status' => $row->status, 'gateway' => $source === 'payment' ? $row->gateway : 'legacy', 'amount' => $row->amount];
            $zakatId = $source === 'payment' && $row->sourceType === 'zakat' ? $row->sourceId : null;
            $row->delete();
            if ($zakatId && ! PaymentTransaction::where('module_source', 'lazsip')->where('source_type', 'zakat')->where('source_id', $zakatId)->exists()) {
                LazsipZakatDetail::whereKey($zakatId)->delete();
            }
            // Idempotency tombstones remain: an old checkout retry must not create a new payment.
            DB::afterCommit(fn () => Log::notice('LAZSIP test transaction deleted by administrator.', $snapshot));
        });
        return response()->json(['ok' => true])->header('Cache-Control', 'no-store, private');
    }
}
