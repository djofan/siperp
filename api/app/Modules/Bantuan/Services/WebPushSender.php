<?php

namespace App\Modules\Bantuan\Services;

use App\Modules\Bantuan\Http\Controllers\WebPushController;
use App\Modules\Core\Auth\SessionData;
use App\Modules\Core\Models\User;
use Illuminate\Support\Facades\DB;

class WebPushSender
{
    public int $failed = 0;

    public function sendPending(): int
    {
        $this->failed = 0;
        $keys = app(WebPushKeys::class)->read();
        if (! $keys) {
            return 0;
        }
        $sent = 0;
        DB::table('bantuan_web_subscriptions')->orderBy('id')->chunkById(100, function ($subscriptions) use ($keys, &$sent) {
            foreach ($subscriptions as $subscription) {
                $registration = fn () => DB::table('bantuan_web_subscriptions')->where('id', $subscription->id)
                    ->where('user_id', $subscription->user_id)->where('access_token_id', $subscription->access_token_id);
                $user = User::find($subscription->user_id);
                if (! $user || ! $this->validSession($subscription, $user)) {
                    $registration()->delete();

                    continue;
                }
                $session = app(SessionData::class)->forUser($user);
                if (! DB::table('modules')->where('slug', 'bantuan')->exists()
                    || (! $user->is_superadmin && ! in_array('bantuan', $session['moduleSlugs'], true))) {
                    continue;
                }
                $notes = DB::table('bantuan_notifications as n')->where('n.user_id', $user->id)->whereNull('n.read_at')
                    ->where('n.created_at', '>=', $subscription->created_at)->where('n.created_at', '>=', now()->subDays(7))
                    ->whereNotExists(function ($q) use ($subscription) {
                        $q->selectRaw('1')->from('bantuan_web_deliveries as d')->whereColumn('d.notification_id', 'n.id')
                            ->where('d.subscription_id', $subscription->id)->where('d.access_token_id', $subscription->access_token_id);
                    })->orderBy('n.created_at')->orderBy('n.id')->limit(50)->get();
                foreach ($notes as $note) {
                    if (! $registration()->exists() || ! $this->validSession($subscription, $user->fresh())) {
                        break;
                    }
                    try {
                        $data = decrypt($subscription->subscription);
                        if (! WebPushController::allowedEndpoint($data['endpoint'])) {
                            $registration()->delete();
                            break;
                        }
                        $response = app(WebPushClient::class)->send($data, [
                            'title' => 'SIPERP Bantuan',
                            'body' => 'Ada pembaruan bantuan. Buka aplikasi untuk melihatnya.',
                            'tag' => (string) $note->id,
                        ], $keys);
                    } catch (\Throwable) {
                        // Retry on the next scheduler run. Never log subscription endpoints or encryption keys.
                        $this->failed++;
                        break;
                    }
                    if ($response['expired']) {
                        $registration()->delete();
                        break;
                    }
                    if (! $response['success']) {
                        $this->failed++;
                        break;
                    }
                    DB::table('bantuan_web_deliveries')->insertOrIgnore(['subscription_id' => $subscription->id, 'notification_id' => $note->id,
                        'access_token_id' => $subscription->access_token_id, 'sent_at' => now()]);
                    $sent++;
                }
            }
        });
        DB::table('bantuan_web_deliveries')->where('sent_at', '<', now()->subDays(8))->delete();

        return $sent;
    }

    private function validSession(object $subscription, ?User $user): bool
    {
        if (! $user || ! $user->is_active) {
            return false;
        }
        $query = DB::table('personal_access_tokens')->where('id', $subscription->access_token_id)
            ->where('tokenable_id', $user->id)->where('tokenable_type', $user->getMorphClass())
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()));
        if ($minutes = config('sanctum.expiration')) {
            $query->where('created_at', '>', now()->subMinutes($minutes));
        }

        return $query->exists();
    }
}
