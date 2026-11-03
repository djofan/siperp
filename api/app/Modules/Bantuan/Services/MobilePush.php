<?php

namespace App\Modules\Bantuan\Services;

use App\Modules\Core\Auth\SessionData;
use App\Modules\Core\Models\User;
use Illuminate\Support\Facades\DB;

class MobilePush
{
    public function sendPending(): int
    {
        $sent = 0;
        if (! config('bantuan-mobile.credentials')) {
            return 0;
        }
        DB::table('bantuan_mobile_devices')->orderBy('token_hash')->chunk(100, function ($devices) use (&$sent) {
            foreach ($devices as $device) {
                $token = DB::table('personal_access_tokens')->where('id', $device->access_token_id)->where('tokenable_id', $device->user_id)->first();
                $user = User::find($device->user_id);
                if (! $token || $token->name !== 'bantuan-mobile' || ($token->expires_at && now()->gte($token->expires_at)) || ! $user || ! $user->is_active) {
                    DB::table('bantuan_mobile_devices')->where('token_hash', $device->token_hash)->delete();

                    continue;
                }
                $module = DB::table('modules')->where('slug', 'bantuan')->first();
                $session = app(SessionData::class)->forUser($user);
                if (! $module || (! $user->is_superadmin && ! in_array('bantuan', $session['moduleSlugs'], true))) {
                    continue;
                }
                $notes = DB::table('bantuan_notifications as n')->where('n.user_id', $device->user_id)->whereNull('n.read_at')
                    ->where('n.created_at', '>=', $device->created_at)->where('n.created_at', '>=', now()->subDays(7))
                    ->whereNotExists(function ($q) use ($device) {
                        $q->selectRaw('1')->from('bantuan_mobile_deliveries as d')->whereColumn('d.notification_id', 'n.id')
                            ->where('d.token_hash', $device->token_hash)->where('d.access_token_id', $device->access_token_id);
                    })->orderBy('n.created_at')->orderBy('n.id')->limit(50)->get();
                foreach ($notes as $note) {
                    // Recheck registration to avoid sending when logout/token rotation happened during this run.
                    if (! DB::table('bantuan_mobile_devices')->where('token_hash', $device->token_hash)->where('access_token_id', $device->access_token_id)->exists()) {
                        break;
                    }
                    $response = app(FcmClient::class)->send([
                        'token' => decrypt($device->token),
                        'notification' => ['title' => 'SIPERP Bantuan', 'body' => 'Ada pembaruan pengajuan bantuan. Buka aplikasi untuk melihatnya.'],
                        'data' => ['notification_id' => (string) $note->id],
                        'android' => ['priority' => 'high', 'notification' => ['channel_id' => 'bantuan_updates', 'tag' => (string) $note->id]],
                        'apns' => ['payload' => ['aps' => ['sound' => 'default']]],
                    ]);
                    if ($response->successful()) {
                        DB::table('bantuan_mobile_deliveries')->insertOrIgnore(['notification_id' => $note->id, 'token_hash' => $device->token_hash, 'access_token_id' => $device->access_token_id, 'sent_at' => now()]);
                        $sent++;
                    } else {
                        $unregistered = collect($response->json('error.details') ?? [])->contains(fn ($d) => ($d['errorCode'] ?? '') === 'UNREGISTERED');
                        if ($unregistered) {
                            DB::table('bantuan_mobile_devices')->where('token_hash', $device->token_hash)->delete();
                        }
                        break;
                    }
                }
            }
        });
        DB::table('bantuan_mobile_deliveries')->where('sent_at', '<', now()->subDays(8))->delete();

        return $sent;
    }
}
