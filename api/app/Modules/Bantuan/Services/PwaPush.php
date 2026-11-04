<?php

namespace App\Modules\Bantuan\Services;

use App\Modules\Core\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PwaPush
{
    public function sendPending(): int
    {
        $settings = app(PwaPushSettings::class);
        if (! $settings->publicConfig()) return 0;
        $sent = 0;
        DB::table('bantuan_pwa_devices')->orderBy('token_hash')->chunk(100, function ($devices) use (&$sent, $settings) {
            foreach ($devices as $device) {
                $token = DB::table('personal_access_tokens')->where('id', $device->access_token_id)->where('tokenable_id', $device->user_id)->first();
                $user = User::find($device->user_id);
                if (! $token || $token->name !== 'next-server' || ($token->expires_at && now()->gte($token->expires_at)) || ! $user || ! $user->is_active) {
                    DB::table('bantuan_pwa_devices')->where('token_hash', $device->token_hash)->delete();
                    continue;
                }
                $module = DB::table('modules')->where('slug', 'bantuan')->first();
                if (! $module || (! $user->is_superadmin && (! $module->is_active || ! DB::table('module_access')->where('module_id', $module->id)->where('user_id', $user->id)->exists()))) continue;
                $notes = DB::table('bantuan_notifications as n')->where('n.user_id', $device->user_id)->whereNull('n.read_at')
                    ->where('n.created_at', '>=', $device->created_at)->where('n.created_at', '>=', now()->subDays(7))
                    ->whereNotExists(function ($q) use ($device) {
                        $q->selectRaw('1')->from('bantuan_pwa_deliveries as d')->whereColumn('d.notification_id', 'n.id')
                            ->where('d.token_hash', $device->token_hash)->where('d.access_token_id', $device->access_token_id);
                    })->orderBy('n.created_at')->orderBy('n.id')->limit(50)->get();
                foreach ($notes as $note) {
                    if (! DB::table('bantuan_pwa_devices')->where('token_hash', $device->token_hash)->where('access_token_id', $device->access_token_id)->exists()
                        || ! DB::table('personal_access_tokens')->where('id', $device->access_token_id)->exists()) break;
                    // Data-only Web Push: the PWA worker validates the live cookie/session
                    // before showing a generic notification. No beneficiary data is sent.
                    $response = app(FcmClient::class)->send([
                        'token' => decrypt($device->token),
                        'data' => ['type' => 'bantuan_pwa', 'binding' => $settings->binding($device->access_token_id), 'notification_id' => (string) $note->id],
                        'webpush' => ['headers' => ['Urgency' => 'high', 'TTL' => '60']],
                    ]);
                    if ($response->successful()) {
                        DB::table('bantuan_pwa_deliveries')->insertOrIgnore(['notification_id' => $note->id, 'token_hash' => $device->token_hash, 'access_token_id' => $device->access_token_id, 'sent_at' => now()]);
                        $sent++;
                    } else {
                        Log::warning('Bantuan PWA push ditolak FCM.', ['http_status' => $response->status(), 'error_status' => $response->json('error.status')]);
                        $invalid = collect($response->json('error.details') ?? [])->contains(fn ($d) => ($d['errorCode'] ?? '') === 'UNREGISTERED');
                        if ($invalid) DB::table('bantuan_pwa_devices')->where('token_hash', $device->token_hash)->delete();
                        break;
                    }
                }
            }
        });
        DB::table('bantuan_pwa_deliveries')->where('sent_at', '<', now()->subDays(8))->delete();

        return $sent;
    }
}
