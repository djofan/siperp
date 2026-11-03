<?php

namespace App\Modules\Bantuan\Services;

use Google\Auth\Credentials\ServiceAccountCredentials;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class FcmClient
{
    public function send(array $message, bool $validateOnly = false): Response
    {
        $path = config('bantuan-mobile.credentials');
        if (! $path || ! is_file($path)) {
            throw new \RuntimeException('Firebase credentials missing.');
        }
        $credentials = json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        if (($credentials['type'] ?? '') !== 'service_account' || ($credentials['token_uri'] ?? '') !== 'https://oauth2.googleapis.com/token') {
            throw new \RuntimeException('Invalid credentials type.');
        }
        $project = $credentials['project_id'];
        if (! preg_match('/^[a-z0-9][a-z0-9-]{3,62}$/D', $project)) {
            throw new \RuntimeException('Invalid project.');
        }
        $key = 'bantuan-fcm-oauth-'.hash('sha256', $credentials['private_key_id'] ?? $path);
        $bearer = Cache::remember($key, 3000, function () use ($credentials) {
            $client = new ServiceAccountCredentials('https://www.googleapis.com/auth/firebase.messaging', $credentials);

            return $client->fetchAuthToken()['access_token'];
        });
        $response = Http::withToken($bearer)->connectTimeout(10)->timeout(20)->post("https://fcm.googleapis.com/v1/projects/{$project}/messages:send", ['message' => $message, 'validate_only' => $validateOnly]);
        if ($response->status() === 401) {
            Cache::forget($key);
        }

        return $response;
    }
}
