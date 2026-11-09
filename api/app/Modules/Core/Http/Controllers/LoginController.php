<?php

namespace App\Modules\Core\Http\Controllers;

use App\Modules\Core\Auth\AccountCodes;
use App\Modules\Core\Auth\SessionData;
use App\Modules\Core\Auth\TokenIssuer;
use App\Modules\Core\Http\Requests\LoginRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

class LoginController
{
    public function __invoke(LoginRequest $request, TokenIssuer $issuer, SessionData $sessions): JsonResponse
    {
        $user = AccountCodes::find($request->validated('code'));
        abort_unless($user && $user->is_active && Hash::check($request->validated('password'), $user->password_hash), 401, 'Kode akun atau password salah.');
        $remember = $request->boolean('remember');
        $minutes = $remember ? config('frontend.remembered_session_minutes') : config('frontend.browser_session_token_minutes');
        $token = $issuer->issue($user, 'next-server', now()->addMinutes($minutes));

        return response()->json(['ok' => true, 'data' => $sessions->forUser($user)])
            ->withCookie(cookie('sip_session', $token->plainTextToken, $remember ? $minutes : 0, '/', null, config('frontend.secure_cookie'), true, false, 'lax'));
    }
}
