<?php

namespace App\Modules\Payment\Http\Controllers;

use App\Modules\Core\Http\Middleware\RequireModuleAccess;
use App\Modules\Payment\Models\PaymentTransaction;
use App\Modules\Payment\Services\ChartService;
use App\Modules\Payment\Services\CheckoutService;
use App\Modules\Payment\Services\IpaymuService;
use App\Modules\Payment\Services\TransactionService;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class PaymentController
{
    public function index(Request $request): Response
    {
        $input = $request->validate(['moduleSource' => 'required|in:lazsip,sarsip', 'page' => 'sometimes|integer|min:1', 'per_page' => 'sometimes|integer|min:1|max:100']);

        return app(RequireModuleAccess::class)->handle($request, fn () => response()->json(PaymentTransaction::with('donor:id,name')->where('module_source', $input['moduleSource'])->orderByDesc('created_at')->orderBy('id')->paginate($request->integer('per_page', 100))), $input['moduleSource']);
    }

    public function charts(Request $request, ChartService $charts): Response
    {
        $input = $request->validate(['moduleSource' => 'required|in:lazsip,sarsip']);

        return app(RequireModuleAccess::class)->handle($request, fn () => response()->json(['data' => $charts->summarize($input['moduleSource'])]), $input['moduleSource']);
    }

    public function checkout(Request $request, CheckoutService $checkout): JsonResponse
    {
        $request->merge(['idempotencyKey' => $request->header('Idempotency-Key')]);
        $input = $request->validate(['idempotencyKey' => ['required', 'string', 'max:128', 'regex:/^[A-Za-z0-9._:-]+$/D'], 'moduleSource' => 'required|in:lazsip,sarsip', 'sourceType' => 'required|in:campaign,zakat', 'sourceId' => 'required_if:sourceType,campaign|string|max:191', 'fundType' => 'required|in:infak,zakat,donasi', 'donorName' => 'required|string|max:191', 'donorPhone' => 'sometimes|nullable|string|max:191', 'donorEmail' => 'sometimes|nullable|string|max:191', 'amount' => 'required|integer|min:1|max:2147483647', 'isAnonymous' => 'sometimes|boolean', 'coversFee' => 'sometimes|boolean', 'paymentMethod' => 'required|string|max:191', 'zakatType' => 'required_if:sourceType,zakat|in:maal,fitrah', 'goldPriceSnapshot' => 'sometimes|nullable|numeric|min:0|max:2147483647', 'jiwaCount' => 'sometimes|nullable|integer|min:1|max:100000']);
        $key = $input['idempotencyKey'];
        unset($input['idempotencyKey']);
        $row = $checkout->create($input, $key);

        return response()->json(['transactionId' => $row->id], 201)->header('Location', config('payment.public_url').'/payment/checkout/'.$row->id);
    }

    public function status(string $id, TransactionService $transactions): JsonResponse
    {
        $row = PaymentTransaction::findOrFail($id);
        app(IpaymuService::class)->enqueueReconciliation($row);
        return response()->json($transactions->publicData($row))->header('Cache-Control', 'no-store');
    }

    public function simulate(Request $request, string $id, TransactionService $transactions): Response
    {
        $row = PaymentTransaction::findOrFail($id);

        return app(RequireModuleAccess::class)->handle($request, function () use ($request, $row, $transactions): JsonResponse {
            abort_unless($row->gateway === 'simulation', 409, 'Pembayaran gateway harus diverifikasi melalui iPaymu.');
            $data = $request->validate(['status' => 'required|in:paid,failed']);
            $transactions->finalize($row->id, $data['status']);

            return response()->json(['ok' => true]);
        }, $row->moduleSource);
    }

    public function session(string $id, IpaymuService $gateway): JsonResponse
    {
        $row = PaymentTransaction::findOrFail($id);
        abort_unless(in_array($row->gateway, ['ipaymu', 'ipaymu_sandbox'], true) && $row->status === 'pending', 409);
        abort_unless($row->gateway === config('payment.gateway'), 409, 'Transaksi ini dibuat untuk mode iPaymu yang berbeda. Buat transaksi baru setelah mengganti konfigurasi gateway.');
        if ($gateway->safeUrl($row->gatewayCheckoutUrl)) {
            return response()->json(['url' => $row->gatewayCheckoutUrl]);
        }
        $gateway->configuration();
        $claimed = PaymentTransaction::whereKey($id)->where('gateway', config('payment.gateway'))->where('status', 'pending')->where('gateway_state', 'not_started')->update(['gateway_state' => 'creating']);
        abort_unless($claimed === 1, 409, 'Sesi sedang diproses atau perlu diperiksa admin. Jangan membuat transaksi ulang.');
        try {
            $session = $gateway->createSession($row);
            PaymentTransaction::whereKey($id)->where('status', 'pending')->where('gateway_state', 'creating')->update(['gateway_session_id' => $session['sessionId'], 'gateway_checkout_url' => $session['url'], 'gateway_state' => 'ready']);

            return response()->json(['url' => $session['url']]);
        } catch (RequestException $error) {
            $status = $error->response->status();
            if ($status >= 400 && $status < 500) {
                PaymentTransaction::whereKey($id)->where('gateway_state', 'creating')->update(['gateway_state' => 'not_started']);
            } else {
                PaymentTransaction::whereKey($id)->where('gateway_state', 'creating')->update(['gateway_state' => 'needs_review']);
            }
            Log::warning('iPaymu session request rejected.', ['transaction_id' => $id, 'gateway' => $row->gateway, 'provider_status' => $status]);
            $message = in_array($status, [401, 403], true)
                ? 'Kredensial iPaymu ditolak. Pastikan VA dan API key berasal dari mode yang sama.'
                : ($status >= 400 && $status < 500
                    ? 'Permintaan ditolak iPaymu. Periksa domain, IP server, dan konfigurasi pembayaran.'
                    : 'Sesi belum dapat dipastikan. Hubungi admin; jangan membuat pembayaran ulang.');
            abort(502, $message);
        } catch (\Throwable $error) {
            PaymentTransaction::whereKey($id)->where('gateway_state', 'creating')->update(['gateway_state' => 'needs_review']);
            Log::error('iPaymu session result is uncertain.', ['transaction_id' => $id, 'gateway' => $row->gateway, 'exception' => $error::class]);
            abort(502, 'Sesi belum dapat dipastikan. Hubungi admin; jangan membuat pembayaran ulang.');
        }
    }

    public function sync(string $id, IpaymuService $gateway, TransactionService $transactions): JsonResponse
    {
        $row = PaymentTransaction::whereIn('gateway', ['ipaymu', 'ipaymu_sandbox'])->findOrFail($id);
        abort_unless($row->gateway === config('payment.gateway'), 409, 'Transaksi ini dibuat untuk mode iPaymu yang berbeda.');
        try {
            $row = $gateway->sync($row);
        } catch (\Symfony\Component\HttpKernel\Exception\HttpException $error) {
            throw $error;
        } catch (\Throwable) {
            abort(502, 'Status belum dapat diverifikasi.');
        }

        return response()->json($transactions->publicData($row->refresh()))->header('Cache-Control', 'no-store');
    }

    public function webhook(Request $request, IpaymuService $gateway): JsonResponse
    {
        $gateway->configuration();
        $data = $request->all();
        abort_unless($gateway->verifyCallback($data, $request->header('X-Signature')), 401, 'Tanda tangan tidak valid.');
        $payload = array_intersect_key($data, array_flip(['reference_id', 'referenceId', 'trx_id', 'sid', 'merchant', 'sub_total', 'amount']));
        try {
            \App\Modules\Payment\Jobs\ProcessIpaymuCallback::dispatch($payload);
        } catch (\Throwable) {
            abort(503, 'Notifikasi belum dapat disimpan. Silakan kirim ulang.');
        }

        return response()->json(['received' => true]);
    }
}
