<?php

namespace App\Modules\Bantuan\Services;

use Illuminate\Http\Request;

class PwaPushSettings
{
    public function publicConfig(): ?array
    {
        $web = config('bantuan-mobile.web', []);
        foreach (['apiKey', 'projectId', 'messagingSenderId', 'appId', 'vapidKey'] as $key) {
            if (! is_string($web[$key] ?? null) || trim($web[$key]) === '') return null;
        }
        if (! config('bantuan-mobile.credentials')) return null;

        return ['firebase' => array_intersect_key($web, array_flip(['apiKey', 'projectId', 'messagingSenderId', 'appId'])), 'vapidKey' => $web['vapidKey']];
    }

    public function session(Request $request)
    {
        $token = $request->user()->currentAccessToken();
        abort_unless($token && $token->name === 'next-server', 403, 'Sesi web diperlukan.');

        return $token;
    }

    public function binding(string $tokenId): string
    {
        // Opaque correlation only: never expose the Sanctum token or session id.
        return hash_hmac('sha256', 'bantuan-pwa:'.$tokenId, (string) config('app.key'));
    }
}
