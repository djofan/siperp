<?php

namespace App\Modules\Core\Http\Controllers;

use App\Modules\Core\Auth\SessionData;
use App\Modules\Core\Auth\TokenIssuer;
use App\Modules\Core\Http\Requests\LoginRequest;
use App\Modules\Core\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;

class LoginController
{
    public function __invoke(LoginRequest $request, TokenIssuer $issuer, SessionData $sessions): JsonResponse
    {
        $user = User::where('email', trim($request->validated('email')))->first();
        abort_unless($user && $user->is_active && Hash::check($request->validated('password'), $user->password_hash), 401, 'Email atau password salah.');
        $token = $issuer->issue($user);

        return response()->json(['ok' => true, 'data' => $sessions->forUser($user)])
            ->withCookie(cookie('sip_session', $token->plainTextToken, 10080, '/', null, config('frontend.secure_cookie'), true, false, 'lax'));
    }
}
