<?php

namespace App\Modules\Lazsip\Services;

use App\Modules\Payment\Models\PaymentDonor;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\RateLimiter;

class HistoryEmailService
{
    public function send(string $email, DonorHistoryService $history): void
    {
        $key = 'lazsip-history-email:'.hash_hmac('sha256', $email, (string) config('app.key'));
        abort_if(RateLimiter::tooManyAttempts($key, 1) || RateLimiter::tooManyAttempts($key.':hour', 5), 429, 'Tunggu 60 detik sebelum meminta ulang. Maksimal 5 email per jam.');
        $apiKey = config('payment.resend.key');
        $from = config('payment.resend.from');
        abort_unless($apiKey && $from, 503, 'Layanan email belum dikonfigurasi. Silakan hubungi admin.');
        $minuteAttempts = RateLimiter::hit($key, 60);
        $hourAttempts = RateLimiter::hit($key.':hour', 3600);
        abort_if($minuteAttempts > 1 || $hourAttempts > 5, 429, 'Tunggu sebelum meminta riwayat kembali.');
        $donor = PaymentDonor::where('email', $email)->first();
        $content = $this->content($donor ? $history->history($donor->id) : []);
        try {
            $response = Http::timeout(15)->withToken($apiKey)->post('https://api.resend.com/emails', [
                'from' => $from, 'to' => $email, 'subject' => 'Riwayat transaksi donasi & zakat LAZSIP',
                'html' => $content['html'], 'text' => $content['text'],
            ]);
            if (! $response->successful()) {
                \Illuminate\Support\Facades\Log::warning('LAZSIP history email rejected by provider.', ['status' => $response->status()]);
                abort(503, 'Email riwayat belum dapat dikirim. Silakan hubungi admin untuk memeriksa layanan email.');
            }
        } catch (\Illuminate\Http\Client\ConnectionException) {
            abort(503, 'Layanan email belum dapat dihubungi. Silakan coba lagi nanti.');
        }
    }

    public function content(array $items): array
    {
        $escape = fn ($value) => htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
        $intro = "Assalamu'alaikum,\n\nBerikut riwayat transaksi (donasi & zakat) yang tercatat dengan email ini:";
        $text = $intro."\n\nTanggal\tJenis\tNominal\tStatus\tKode\n";
        $rows = '';
        $statuses = ['paid' => 'Lunas', 'pending' => 'Menunggu pembayaran', 'failed' => 'Gagal', 'expired' => 'Kedaluwarsa', 'cancelled' => 'Dibatalkan'];
        foreach ($items as $item) {
            $cells = [\Illuminate\Support\Carbon::parse($item['createdAt'])->setTimezone('Asia/Jakarta')->format('d/m/Y'),
                ($item['type'] === 'donasi' ? 'Donasi' : 'Zakat').' — '.$item['label'],
                'Rp'.number_format((float) $item['amount'], 0, ',', '.'),
                $statuses[$item['status']] ?? 'Tidak diketahui', $item['trackingCode']];
            $text .= implode("\t", $cells)."\n";
            $rows .= '<tr>'.implode('', array_map(fn ($cell) => '<td style="padding:12px;border-bottom:1px solid #e5eadf;vertical-align:top">'.$escape($cell).'</td>', $cells)).'</tr>';
        }
        if (! $items) {
            $rows = '<tr><td colspan="5" style="padding:16px">Belum ada transaksi donasi atau zakat yang tercatat dengan email ini.</td></tr>';
            $text .= "Belum ada transaksi donasi atau zakat yang tercatat dengan email ini.\n";
        }
        $footer = 'Nominal tidak termasuk biaya admin. Jangan bagikan kode transaksi Anda kepada orang lain.';
        return ['html' => '<div style="font-family:Arial,sans-serif;color:#20380d;line-height:1.6"><p>'.nl2br($escape($intro)).'</p><div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;text-align:left"><thead><tr style="background:#f0f4e9"><th style="padding:12px">Tanggal</th><th style="padding:12px">Jenis</th><th style="padding:12px">Nominal</th><th style="padding:12px">Status</th><th style="padding:12px">Kode</th></tr></thead><tbody>'.$rows.'</tbody></table></div><p style="font-size:12px;color:#68795b">'.$footer.'</p></div>', 'text' => $text."\n".$footer];
    }
}
