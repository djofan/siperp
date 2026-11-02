<?php

namespace App\Modules\Bantuan\Services;

use App\Modules\Bantuan\Models\Application;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class Whatsapp
{
    public static function isTaskEvent(string $action): bool
    {
        return str_starts_with($action, 'Pengingat:') || in_array($action, [
            'submit', 'screen_pass', 'review1_approve', 'assign_survey', 'survey_submit',
            'survey_review_submit', 'survey_return', 'survey_decline', 'approve', 'survey_again',
            'assign_distributor', 'Penyalur diperbarui', 'fund_submit', 'fund_approve', 'fund_reject',
            'disburse', 'delivery_fail', 'reopen', 'request_data',
        ], true);
    }

    public const TASKS = [
        'needs_data' => [['requester', 'verifier', 'call_center'], 'Lengkapi data pengajuan'],
        'screening' => [['call_center'], 'Periksa pengajuan'],
        'review1' => [['approver', 'chair'], 'Review awal pengajuan'],
        'survey_assignment' => [['call_center'], 'Tentukan verifikator'],
        'survey_assigned' => [['verifier'], 'Selesaikan survei'],
        'survey_cc_review' => [['call_center'], 'Review hasil survei'],
        'survey_submitted' => [['approver', 'chair'], 'Putuskan hasil survei'],
        'review2' => [['approver', 'chair'], 'Putuskan pengajuan'],
        'bypass_review' => [['approver', 'chair'], 'Review pengajuan langsung'],
        'approved' => [['call_center'], 'Tentukan penyalur bantuan'],
        'fund_ready' => [['fund_requester'], 'Ajukan dana bantuan'],
        'fund_submitted' => [['fund_requester'], 'Perbarui keputusan dana'],
        'fund_approved' => [['treasurer'], 'Catat pencairan dana'],
        'disbursed' => [['verifier', 'treasurer'], 'Selesaikan penyerahan bantuan'],
        'delivery_failed' => [['treasurer'], 'Catat pengembalian dana'],
    ];

    public static function normalizePhone(?string $phone): ?string
    {
        if ($phone === null || trim($phone) === '') return null;
        if (! preg_match('/^\+?[0-9 ()-]+$/', $phone)) {
            throw ValidationException::withMessages(['phone' => 'Masukkan satu nomor WhatsApp Indonesia yang valid.']);
        }
        $phone = preg_replace('/[ ()+-]/', '', $phone);
        if (str_starts_with($phone, '0')) $phone = '62'.substr($phone, 1);
        if (! preg_match('/^628[0-9]{7,11}$/', $phone)) {
            throw ValidationException::withMessages(['phone' => 'Gunakan nomor seluler 08… atau +628… (10–14 digit).']);
        }
        return $phone;
    }

    public static function phone(?string $encrypted): ?string
    {
        if (! $encrypted) return null;
        try {
            return self::normalizePhone(Crypt::decryptString($encrypted));
        } catch (DecryptException|ValidationException) {
            return null;
        }
    }

    public function configured(): bool
    {
        return (bool) config('bantuan.whatsapp_enabled') && trim((string) config('bantuan.fonnte_token')) !== '' && $this->publicUrl() !== null;
    }

    private function publicUrl(): ?string
    {
        $url = rtrim((string) config('bantuan.public_url'), '/');
        $host = parse_url($url, PHP_URL_HOST);
        if (! filter_var($url, FILTER_VALIDATE_URL) || parse_url($url, PHP_URL_SCHEME) !== 'https'
            || ! $host || ! str_contains($host, '.') || preg_match('/\.(localhost|local|test|invalid)$/i', $host)
            || parse_url($url, PHP_URL_USER) || parse_url($url, PHP_URL_PASS)
            || parse_url($url, PHP_URL_QUERY) || parse_url($url, PHP_URL_FRAGMENT)
            || (filter_var($host, FILTER_VALIDATE_IP) && ! filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE))) return null;
        return $url;
    }

    /** Called immediately after Journal inserts a notification, in the same transaction. No network. */
    public function enqueue(string $notificationId, string $userId, string $appId, string $message): void
    {
        // Deliberately do not retain arbitrary notification text (it can contain PII).
        if (! $this->configured()) return;
        $row = Application::find($appId);
        if (! $row || ! $this->recipient($row, $userId)) return;
        DB::table('bantuan_whatsapp_outbox')->insertOrIgnore([
            'id' => (string) Str::uuid(), 'notification_id' => $notificationId, 'user_id' => $userId,
            'application_id' => $appId, 'application_status' => $row->status,
            'status' => 'pending', 'attempts' => 0, 'available_at' => now(), 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    private function recipient(Application $row, string $userId): ?string
    {
        $task = self::TASKS[$row->status] ?? null;
        if (! $task) return null;
        $member = DB::table('module_access')->join('modules', 'modules.id', '=', 'module_access.module_id')
            ->join('users', 'users.id', '=', 'module_access.user_id')
            ->join('bantuan_staff', 'bantuan_staff.user_id', '=', 'users.id')
            ->where('modules.slug', 'bantuan')->where('modules.is_active', true)->where('users.id', $userId)
            ->where('users.is_active', true)->where('bantuan_staff.whatsapp_enabled', true)
            ->first(['module_access.role', 'bantuan_staff.roles', 'bantuan_staff.phone']);
        if (! $member) return null;
        $roles = Access::expandRoles($member->role, $member->roles);
        // Admin visibility alone is not a task assignment.
        if (! array_intersect($roles, $task[0])) return null;
        if (! in_array('admin', $roles, true)) {
            if ($row->status === 'screening' && $row->intake_role === 'requester' && $row->created_by === $userId) return null;
            if ($row->status === 'survey_cc_review' && $row->verifier_id === $userId) return null;
            if (in_array($row->status, ['review1', 'survey_submitted', 'review2', 'bypass_review'], true)
                && in_array($userId, [$row->created_by, $row->verifier_id], true)) return null;
        }
        if ($row->status === 'needs_data' && $row->created_by !== $userId && ! in_array('call_center', $roles, true)) return null;
        if ($row->status === 'survey_assigned' && $row->verifier_id !== $userId) return null;
        if ($row->status === 'disbursed') {
            if ($row->distribution_type === 'direct') {
                if (! in_array('treasurer', $roles, true)) return null;
            } elseif ($row->distribution_type !== 'verifier' || $row->distributor_id !== $userId || ! in_array('verifier', $roles, true)) return null;
        }
        return self::phone($member->phone);
    }

    /** Run from scheduler/CLI only; never dispatch through the sync queue. */
    public function process(int $limit = 20): int
    {
        if (! $this->configured()) return 0;
        // A crashed request may have reached Fonnte. Do not automatically resend it.
        DB::table('bantuan_whatsapp_outbox')->where('status', 'processing')->where('claimed_at', '<', now()->subMinutes(5))
            ->update(['status' => 'failed', 'last_error' => 'delivery_unknown', 'updated_at' => now()]);
        $ids = DB::table('bantuan_whatsapp_outbox')->where('status', 'pending')->where('available_at', '<=', now())
            ->orderBy('available_at')->limit(max(1, min($limit, 100)))->pluck('id');
        $count = 0;
        foreach ($ids as $id) {
            $claimed = DB::table('bantuan_whatsapp_outbox')->where('id', $id)->where('status', 'pending')
                ->update(['status' => 'processing', 'claimed_at' => now(), 'updated_at' => now(), 'attempts' => DB::raw('attempts + 1')]);
            if (! $claimed) continue;
            $item = DB::table('bantuan_whatsapp_outbox')->where('id', $id)->first();
            $row = Application::find($item->application_id);
            $phone = $row && $row->status === $item->application_status ? $this->recipient($row, $item->user_id) : null;
            $notification = DB::table('bantuan_notifications')->where('id', $item->notification_id)
                ->where('user_id', $item->user_id)->where('application_id', $item->application_id)->exists();
            if (! $phone || ! $notification) {
                $this->finish($id, 'skipped', 'task_or_recipient_inactive');
                continue;
            }
            // Number is generated by the application, not taken from notification text.
            $number = preg_replace('/[^A-Za-z0-9\/-]/', '', $row->number);
            $message = $number.' · '.self::TASKS[$row->status][1]."\n".$this->publicUrl().'/admin/bantuan/pengajuan/'.rawurlencode($row->id);
            try {
                $response = Http::asForm()->withHeaders(['Authorization' => (string) config('bantuan.fonnte_token')])
                    ->connectTimeout(3)->timeout(10)->withoutRedirecting()->post('https://api.fonnte.com/send', [
                        'target' => $phone, 'message' => $message, 'countryCode' => '0',
                    ]);
                if ($response->successful() && $response->json('status') === true) {
                    $this->finish($id, 'sent');
                    $count++;
                } elseif ($response->json('status') === false || $response->status() === 429) {
                    // Explicit refusal can be retried; a timeout/ambiguous response cannot.
                    $retry = $item->attempts < 3;
                    DB::table('bantuan_whatsapp_outbox')->where('id', $id)->update([
                        'status' => $retry ? 'pending' : 'failed', 'last_error' => 'provider_rejected',
                        'available_at' => now()->addMinutes($item->attempts * 5), 'updated_at' => now(),
                    ]);
                } else {
                    $this->finish($id, 'failed', 'delivery_unknown');
                }
            } catch (\Throwable) {
                // Never log the exception, token, target, provider body, or message.
                $this->finish($id, 'failed', 'delivery_unknown');
            }
        }
        return $count;
    }

    private function finish(string $id, string $status, ?string $error = null): void
    {
        DB::table('bantuan_whatsapp_outbox')->where('id', $id)->update([
            'status' => $status, 'last_error' => $error, 'sent_at' => $status === 'sent' ? now() : null, 'updated_at' => now(),
        ]);
        if ($status === 'failed') Log::warning('Bantuan WhatsApp outbox failed', ['outbox_id' => $id, 'reason' => $error]);
    }
}
