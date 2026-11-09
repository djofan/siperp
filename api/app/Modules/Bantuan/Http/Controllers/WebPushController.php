<?php

namespace App\Modules\Bantuan\Http\Controllers;

use App\Modules\Bantuan\Services\WebPushKeys;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class WebPushController
{
    public function configuration(WebPushKeys $keys)
    {
        $key = $keys->read();

        return (new JsonResource(['enabled' => $key !== null, 'publicKey' => $key['publicKey'] ?? null]))->response()->header('Cache-Control', 'no-store');
    }

    public function store(Request $request, WebPushKeys $keys)
    {
        abort_unless($keys->read(), 503, 'Web Push belum dikonfigurasi di server.');
        $data = $request->validate([
            'endpoint' => ['required', 'string', 'max:2048', function ($attribute, $value, $fail) {
                if (! self::allowedEndpoint($value)) {
                    $fail('Endpoint layanan push browser tidak didukung.');
                }
            }],
            'keys' => 'required|array:p256dh,auth',
            'keys.p256dh' => 'required|string|max:100',
            'keys.auth' => 'required|string|max:30',
        ]);
        $public = self::decode($data['keys']['p256dh']);
        if (strlen($public) !== 65 || $public[0] !== "\x04" || strlen(self::decode($data['keys']['auth'])) !== 16) {
            throw ValidationException::withMessages(['keys' => 'Kunci langganan push browser tidak valid.']);
        }
        $id = hash('sha256', $data['endpoint']);
        $tokenId = $request->user()->currentAccessToken()->id;
        DB::transaction(function () use ($id, $tokenId, $request, $data) {
            $old = DB::table('bantuan_web_subscriptions')->where('id', $id)->lockForUpdate()->first();
            DB::table('bantuan_web_subscriptions')->updateOrInsert(['id' => $id], [
                'user_id' => $request->user()->id, 'access_token_id' => $tokenId,
                'subscription' => encrypt($data),
                'created_at' => $old && (string) $old->access_token_id === (string) $tokenId ? $old->created_at : now(),
            ]);
        });

        return response()->noContent();
    }

    public function destroy(Request $request)
    {
        $data = $request->validate(['endpoint' => 'required|string|max:2048']);
        DB::table('bantuan_web_subscriptions')->where('id', hash('sha256', $data['endpoint']))
            ->where('user_id', $request->user()->id)->where('access_token_id', $request->user()->currentAccessToken()->id)->delete();

        return response()->noContent();
    }

    public static function allowedEndpoint(string $endpoint): bool
    {
        $url = parse_url($endpoint);
        if (! $url || ($url['scheme'] ?? '') !== 'https' || isset($url['user']) || isset($url['pass']) || isset($url['fragment']) || ($url['port'] ?? 443) !== 443) {
            return false;
        }
        $host = strtolower($url['host'] ?? '');
        foreach (['fcm.googleapis.com', 'push.services.mozilla.com', 'web.push.apple.com', 'notify.windows.com'] as $allowed) {
            if ($host === $allowed || str_ends_with($host, '.'.$allowed)) {
                return true;
            }
        }

        return false;
    }

    private static function decode(string $value): string
    {
        return preg_match('/^[A-Za-z0-9_-]+$/D', $value) ? (base64_decode(strtr($value, '-_', '+/'), true) ?: '') : '';
    }
}
