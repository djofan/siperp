<?php

namespace App\Modules\Payment\Services;

use App\Modules\Lazsip\Models\LazsipCampaign;
use App\Modules\Lazsip\Models\LazsipZakatDetail;
use App\Modules\Payment\Models\PaymentReceipt;
use App\Modules\Payment\Models\PaymentTransaction;
use App\Modules\Sarsip\Models\SarsipEntry;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ReceiptService
{
    public function queue(PaymentTransaction $row): void
    {
        if ($row->status !== 'paid' || ! $row->paidAt || ! in_array($row->moduleSource, ['lazsip', 'sarsip'], true)) {
            return;
        }
        $donor = $row->donor;
        if (! $donor->email || PaymentReceipt::where('transaction_id', $row->id)->exists()) {
            return;
        }
        $label = $row->sourceType === 'zakat'
            ? (LazsipZakatDetail::find($row->sourceId)?->zakatType === 'fitrah' ? 'Zakat Fitrah' : 'Zakat Maal')
            : ($row->moduleSource === 'sarsip' ? (SarsipEntry::find($row->sourceId)?->title ?? 'Donasi SARSIP') : (LazsipCampaign::find($row->sourceId)?->title ?? 'Donasi LAZSIP'));
        $brand = $row->moduleSource === 'sarsip' ? 'SARSIP' : 'LAZSIP';
        $zakat = $row->sourceType === 'zakat';
        $test = in_array($row->gateway, ['simulation', 'midtrans_sandbox'], true);
        $title = $zakat ? 'Pembayaran zakat berhasil' : 'Donasi '.$brand.' berhasil';
        $note = $test ? 'Ini konfirmasi pengujian/simulasi, bukan bukti penerimaan uang nyata.' : 'Pembayaran Anda telah dikonfirmasi berhasil.';
        $message = $zakat ? 'Terima kasih telah menunaikan zakat melalui LAZSIP. Semoga Allah menerima zakat Anda dan memberikan keberkahan.' : ($brand === 'SARSIP' ? 'Terima kasih atas dukungan Anda untuk misi pencarian, pertolongan, dan kemanusiaan SARSIP.' : 'Terima kasih telah berbagi melalui LAZSIP. Dukungan Anda berarti bagi penerima manfaat campaign ini.');
        $money = fn ($amount) => 'Rp'.number_format($amount, 0, ',', '.');
        $details = [[$zakat ? 'Jenis zakat' : 'Campaign', $label], [$zakat ? 'Nominal zakat' : 'Nominal donasi', $money($row->amount)], ['Biaya admin', $money($row->adminFee)], ['Total pembayaran', $money($row->amount + $row->adminFee)], ['Tanggal pembayaran', $row->paidAt->setTimezone('Asia/Jakarta')->format('d/m/Y H:i:s').' WIB'], ['Kode transaksi', $row->trackingCode]];
        $text = implode("\n\n", [$brand.' — '.$title, $note, "Assalamu'alaikum, {$donor->name}.", $message, ...array_map(fn ($item) => $item[0].': '.$item[1], $details), 'Simpan kode transaksi untuk memeriksa status pembayaran Anda.', 'Salam, Tim '.$brand]);
        $escape = fn ($value) => htmlspecialchars((string) $value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
        $html = '<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h1>'.$brand.'</h1><h2>'.$title.'</h2><p>'.$note.'</p><p>Assalamu\'alaikum, '.$escape($donor->name).'.</p><p>'.$message.'</p><table style="width:100%">';
        foreach ($details as [$key, $value]) {
            $html .= '<tr><td>'.$escape($key).'</td><td>'.$escape($value).'</td></tr>';
        }
        $html .= '</table><p>Simpan kode transaksi untuk memeriksa status pembayaran Anda.</p><p>Salam, Tim '.$brand.'</p></div>';
        $receipt = new PaymentReceipt;
        $receipt->forceFill(['transactionId' => $row->id, 'recipient' => $donor->email, 'subject' => ($test ? '[SIMULASI] ' : '').$title.' — '.$row->trackingCode, 'html' => $html, 'text' => $text, 'status' => 'pending', 'attempts' => 0, 'nextAttemptAt' => now()])->save();
    }

    public function deliver(string $transactionId): void
    {
        $key = config('payment.resend.key');
        $from = config('payment.resend.from');
        if (! $key || ! $from) {
            return;
        }
        $now = now();
        $receipt = PaymentReceipt::where('transaction_id', $transactionId)->first();
        if (! $receipt || in_array($receipt->status, ['sent', 'needs_review'], true) || $receipt->nextAttemptAt > $now || ($receipt->lockedUntil && $receipt->lockedUntil > $now)) {
            return;
        }
        $claim = PaymentReceipt::whereKey($receipt->id)->whereIn('status', ['pending', 'retry', 'sending'])->where('attempts', $receipt->attempts)->where(fn ($query) => $query->whereNull('locked_until')->orWhere('locked_until', '<=', $now));
        if ($receipt->firstAttemptAt && $receipt->firstAttemptAt <= $now->copy()->subHours(23)) {
            $claim->update(['status' => 'needs_review', 'last_error' => 'Periksa log Resend sebelum mencoba kirim ulang.']);

            return;
        }
        if (! $claim->update(['status' => 'sending', 'locked_until' => $now->copy()->addMinute(), 'attempts' => DB::raw('attempts + 1'), 'first_attempt_at' => $receipt->firstAttemptAt ?? $now, 'sender' => $receipt->sender ?? $from])) {
            return;
        }
        try {
            $response = Http::timeout(15)->withToken($key)->withHeaders(['Idempotency-Key' => 'payment-receipt/'.$receipt->id])->post('https://api.resend.com/emails', ['from' => $receipt->sender ?? $from, 'to' => $receipt->recipient, 'subject' => $receipt->subject, 'html' => $receipt->html, 'text' => $receipt->text]);
            $data = $response->throw()->json();
            if (! is_string($data['id'] ?? null)) {
                throw new \RuntimeException('Invalid mail provider response.');
            }
            PaymentReceipt::whereKey($receipt->id)->where('status', 'sending')->update(['status' => 'sent', 'sent_at' => now(), 'provider_id' => $data['id'], 'locked_until' => null, 'last_error' => null]);
        } catch (\Throwable) {
            PaymentReceipt::whereKey($receipt->id)->where('status', 'sending')->update(['status' => 'retry', 'locked_until' => null, 'next_attempt_at' => now()->addSeconds(min(3600, 60 * (2 ** min($receipt->attempts, 6)))), 'last_error' => 'Pengiriman belum dapat dipastikan; akan dicoba ulang dengan kunci yang sama.']);
        }
    }

    public function retry(): int
    {
        $rows = PaymentReceipt::whereIn('status', ['pending', 'retry', 'sending'])->where('next_attempt_at', '<=', now())->where(fn ($query) => $query->whereNull('locked_until')->orWhere('locked_until', '<=', now()))->orderBy('created_at')->limit(50)->get(['transaction_id']);
        foreach ($rows as $row) {
            $this->deliver($row->transactionId);
        }

        return $rows->count();
    }

    public function tracking(PaymentTransaction $row): void
    {
        $key = config('payment.resend.key');
        $from = config('payment.resend.from');
        if (! $key || ! $from || ! $row->donor->email) {
            return;
        }
        try {
            $code = htmlspecialchars($row->trackingCode, ENT_QUOTES, 'UTF-8');
            $total = number_format($row->amount + $row->adminFee, 0, ',', '.');
            Http::timeout(15)->withToken($key)->post('https://api.resend.com/emails', ['from' => $from, 'to' => $row->donor->email, 'subject' => 'Kode Pelacakan Transaksi Anda: '.$row->trackingCode, 'html' => '<p>Assalamu\'alaikum,</p><p>Terima kasih atas transaksi Anda sebesar Rp'.$total.'.</p><p>Kode pelacakan Anda: <strong>'.$code.'</strong></p><p>Simpan kode ini untuk memeriksa status pembayaran Anda.</p>'])->throw();
        } catch (\Throwable) {
            Log::warning('Tracking email delivery deferred.', ['transaction_id' => $row->id]);
        }
    }
}
