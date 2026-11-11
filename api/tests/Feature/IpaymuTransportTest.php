<?php

use App\Modules\Payment\Models\PaymentDonor;
use App\Modules\Payment\Models\PaymentTransaction;
use App\Modules\Payment\Services\IpaymuService;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Request;
use GuzzleHttp\Psr7\Response;
use GuzzleHttp\Psr7\Utils;
use GuzzleHttp\TransferStats;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Factory;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

function useIpaymuTestTransport(HandlerStack $stack): void
{
    Http::swap(new class($stack) extends Factory
    {
        public function __construct(private HandlerStack $transport)
        {
            parent::__construct();
        }

        protected function newPendingRequest(): PendingRequest
        {
            return parent::newPendingRequest()->setHandler($this->transport);
        }
    });
}

beforeEach(function () {
    config(['payment.gateway' => 'ipaymu', 'payment.ipaymu.va' => '1179000899',
        'payment.ipaymu.api_key' => 'transport-test-key', 'payment.ipaymu.base_url' => 'https://my.ipaymu.com/api/v2',
        'payment.public_url' => 'https://erp.example.test', 'payment.api_url' => 'https://erp.example.test/api/v1']);
});

it('preserves checkout bytes and numeric types through Guzzle serialization', function () {
    $history = [];
    $stack = HandlerStack::create(new MockHandler([new Response(200, [], json_encode([
        'Status' => 200, 'Data' => ['SessionID' => 'test-session', 'Url' => 'https://my.ipaymu.com/payment/test-session'],
    ]))]));
    $stack->push(Middleware::history($history));
    // Use real Laravel/Guzzle serialization and middleware, without Http::fake or any network.
    useIpaymuTestTransport($stack);
    $row = (new PaymentTransaction)->forceFill(['id' => 'transport-test', 'gatewayReferenceId' => 'reference-test',
        'gatewayAccountId' => '1179000899', 'trackingCode' => 'LZS-TEST01', 'moduleSource' => 'lazsip',
        'sourceType' => 'campaign', 'amount' => 10007, 'adminFee' => 0]);
    $row->setRelation('donor', (new PaymentDonor)->forceFill(['name' => 'É — 日本 / &', 'email' => 'donor@example.test', 'phone' => '628123456789']));
    app(IpaymuService::class)->createSession($row);

    expect($history)->toHaveCount(1);
    $request = $history[0]['request'];
    $body = (string) $request->getBody();
    $expected = '{"product":["Donasi LAZSIP"],"qty":[1],"price":[10007],"description":["Donasi LAZSIP. Kode transaksi LZS-TEST01."],"returnUrl":"https://erp.example.test/payment/checkout/transport-test","notifyUrl":"https://erp.example.test/api/v1/payment/webhook/ipaymu","cancelUrl":"https://erp.example.test/payment/checkout/transport-test","referenceId":"reference-test","buyerName":"É — 日本 / &","expired":24,"buyerEmail":"donor@example.test","buyerPhone":"628123456789"}';
    expect($body)->toBe($expected)
        ->and($request->getMethod())->toBe('POST')
        ->and((string) $request->getUri())->toBe('https://my.ipaymu.com/api/v2/payment')
        ->and($request->getHeaderLine('Content-Type'))->toBe('application/json')
        ->and($request->getHeaderLine('signature'))->toBe(hash_hmac('sha256', 'POST:1179000899:'.hash('sha256', $expected).':transport-test-key', 'transport-test-key'))
        ->and((int) $request->getHeaderLine('Content-Length'))->toBe(strlen($expected))
        ->and($history[0]['options']['allow_redirects'])->toBeFalse()
        ->and($history[0]['options']['verify'])->toBeTrue();
});

it('does not follow a redirect or forward signed headers to its target', function () {
    $history = [];
    $stack = HandlerStack::create(new MockHandler([
        new Response(302, ['Location' => 'https://other.example.test/redirect']),
        new Response(200, [], '{"Status":200}'),
    ]));
    $stack->push(Middleware::history($history));
    useIpaymuTestTransport($stack);
    Log::spy();
    $result = app(IpaymuService::class)->checkConnection();
    expect($result['httpStatus'])->toBe(302)->and($result['ok'])->toBeFalse()->and($history)->toHaveCount(1);
});

it('logs only safe transport evidence for a rejected checkout', function () {
    useIpaymuTestTransport(HandlerStack::create(new MockHandler([
        new Response(401, [], '{"Status":401,"Message":"Unauthorized Signature","private":"do-not-log"}'),
    ])));
    Log::spy();
    $method = new ReflectionMethod(IpaymuService::class, 'request');
    $method->invoke(app(IpaymuService::class), '/payment', ['buyerName' => 'private-donor-name', 'product' => ['Donasi — Air']]);
    Log::shouldHaveReceived('warning')->once()->withArgs(function ($message, $context) {
        expect($message)->toBe('iPaymu transport diagnostic.')
            ->and($context['http_status'])->toBe(401)
            ->and($context['body_unchanged'])->toBeTrue()
            ->and($context['signature_header_unchanged'])->toBeTrue()
            ->and($context['contains_unicode_escape'])->toBeFalse();
        expect(json_encode($context))->not->toContain('private-donor-name', 'transport-test-key', '1179000899', 'do-not-log');

        return true;
    });
});

it('detects a body mutation after signing in transport diagnostics', function () {
    $stack = HandlerStack::create(new MockHandler([new Response(401, [], '{"Status":401}')]));
    $stack->push(Middleware::mapRequest(fn ($request) => $request->withBody(Utils::streamFor('{"changed":true}'))));
    useIpaymuTestTransport($stack);
    Log::spy();
    app(IpaymuService::class)->checkConnection();
    Log::shouldHaveReceived('warning')->once()->withArgs(fn ($message, $context) => $context['body_unchanged'] === false
        && $context['signature_header_unchanged'] === true);
});

it('records a curl timeout without its error message or request secrets', function () {
    Http::fake(function ($request, $options) {
        $options['on_stats'](new TransferStats(
            new Request('POST', $request->url(), $request->headers(), $request->body()),
            null, 90.0, 28,
        ));
        throw new ConnectionException('private error content');
    });
    Log::spy();
    expect(fn () => app(IpaymuService::class)->checkConnection())->toThrow(ConnectionException::class);
    Log::shouldHaveReceived('warning')->once()->withArgs(function ($message, $context) {
        expect($context['http_status'])->toBeNull()->and($context['curl_error'])->toBe(28)
            ->and($context['duration_ms'])->toBe(90000)
            ->and(json_encode($context))->not->toContain('private error content', 'transport-test-key', '1179000899');

        return true;
    });
});

it('explains invalid successful checkout responses without exposing session tokens', function ($status, $session, $url, $field, $expected) {
    Http::preventStrayRequests();
    Http::fake(['*/payment' => Http::response(['Status' => $status, 'Data' => ['SessionID' => $session, 'Url' => $url]])]);
    Log::spy();
    $row = (new PaymentTransaction)->forceFill(['id' => 'validation-test', 'gatewayReferenceId' => 'reference-test',
        'gatewayAccountId' => '1179000899', 'trackingCode' => 'LZS-TEST01', 'moduleSource' => 'lazsip',
        'sourceType' => 'campaign', 'amount' => 10007, 'adminFee' => 0]);
    $row->setRelation('donor', (new PaymentDonor)->forceFill(['name' => 'private-donor']));
    expect(fn () => app(IpaymuService::class)->createSession($row))->toThrow(RuntimeException::class);
    Log::shouldHaveReceived('warning')->once()->withArgs(function ($message, $context) use ($field, $expected) {
        expect($message)->toBe('iPaymu checkout response validation failed.')
            ->and($context[$field])->toBe($expected)
            ->and($context['http_status'])->toBe(200)
            ->and(json_encode($context))->not->toContain('SECRET_SESSION', 'SECRET_QUERY', 'SECRET_FRAGMENT', 'private-donor', 'transport-test-key', '1179000899');

        return true;
    });
    Http::assertSentCount(1);
})->with([
    ['200', 'SECRET_SESSION', 'https://my.ipaymu.com/payment/SECRET_SESSION', 'provider_status_type', 'string'],
    [200, null, 'https://my.ipaymu.com/payment/SECRET_SESSION', 'session_id_present', false],
    [200, 'SECRET_SESSION', 'https://payment.ipaymu.com/?id=SECRET_QUERY#SECRET_FRAGMENT', 'url_host', 'payment.ipaymu.com'],
    [200, 'SECRET_SESSION', null, 'url_type', 'null'],
]);
