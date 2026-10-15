<?php

namespace App\Modules\Lazsip\Services;

use App\Modules\Lazsip\Models\LazsipHistoryOtp;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class HistoryOtpService
{
    private function hash(string $value): string
    {
        abort_unless(config('app.key'), 503);

        return hash_hmac('sha256', $value, config('app.key'));
    }

    public function request(string $email): array
    {
        $key = $this->hash('history-email:'.$email);
        $id = (string) Str::uuid();
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        DB::table('lazsip_history_otp')->insertOrIgnore(['email_key' => $key]);
        $allowed = DB::transaction(function () use ($key, $id, $code): bool {
            $row = LazsipHistoryOtp::whereKey($key)->lockForUpdate()->firstOrFail();
            $reset = ! $row->windowStart || $row->windowStart < now()->subHour();
            if (($row->sentAt && $row->sentAt >= now()->subMinute()) || (! $reset && $row->sendCount >= 5)) {
                return false;
            }
            $row->forceFill(['challengeId' => $id, 'codeHash' => $this->hash($id.':'.$code), 'expiresAt' => now()->addMinutes(10), 'attempts' => 0, 'sendCount' => $reset ? 1 : $row->sendCount + 1, 'windowStart' => $reset ? now() : $row->windowStart, 'sentAt' => now()])->save();

            return true;
        }, 5);
        if (! $allowed) {
            return ['limited' => true];
        }
        try {
            $apiKey = config('payment.resend.key');
            $from = config('payment.resend.from');
            if (! $apiKey || ! $from) {
                throw new \RuntimeException('Email is unavailable.');
            }
            // Every valid email receives the same flow, including non-donor addresses.
            Http::timeout(15)->withToken($apiKey)->withHeaders(['Idempotency-Key' => 'history-otp/'.$id])->post('https://api.resend.com/emails', ['from' => $from, 'to' => $email, 'subject' => 'Kode verifikasi riwayat LAZSIP', 'html' => '<p>Kode verifikasi untuk membuka riwayat pembayaran LAZSIP:</p><p style="font-size:28px;font-weight:bold">'.$code.'</p><p>Berlaku 10 menit dan hanya dapat digunakan sekali. Jangan bagikan kode ini.</p>'])->throw();

            return ['limited' => false, 'challengeId' => $id];
        } catch (\Throwable) {
            LazsipHistoryOtp::whereKey($key)->where('challenge_id', $id)->update(['code_hash' => null]);
            abort(503, 'Kode belum dapat dikirim.');
        }
    }

    public function verify(string $email, string $id, string $code): bool
    {
        return DB::transaction(function () use ($email, $id, $code): bool {
            $row = LazsipHistoryOtp::whereKey($this->hash('history-email:'.$email))->where('challenge_id', $id)->lockForUpdate()->first();
            if (! $row?->codeHash || ! $row->expiresAt || $row->expiresAt <= now() || $row->attempts >= 5) {
                return false;
            }
            $matches = hash_equals($row->codeHash, $this->hash($id.':'.$code));
            $row->attempts++;
            if ($matches) {
                $row->codeHash = null;
            }
            $row->save();

            return $matches;
        }, 5);
    }
}
