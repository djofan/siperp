<?php

namespace App\Modules\Bantuan\Services;

use GuzzleHttp\Client;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;
use Psr\Http\Client\ClientInterface;

class WebPushClient
{
    public function __construct(private ?ClientInterface $http = null) {}

    public function send(array $subscription, array $payload, array $keys): array
    {
        $push = new WebPush(['VAPID' => ['subject' => config('bantuan-web-push.subject'), ...$keys]],
            ['TTL' => 300, 'urgency' => 'high'], $this->http ?? new Client(['timeout' => 15, 'connect_timeout' => 5, 'allow_redirects' => false]));
        $report = $push->sendOneNotification(Subscription::create([...$subscription, 'contentEncoding' => 'aes128gcm']), json_encode($payload, JSON_THROW_ON_ERROR));

        return ['success' => $report->isSuccess(), 'expired' => $report->isSubscriptionExpired()];
    }
}
