<?php

namespace App\Modules\Core\Http\Controllers;

use App\Modules\Core\Auth\SessionData;
use App\Modules\Core\Auth\TokenIssuer;
use App\Modules\Core\Models\User;
use App\Support\ModuleSessions;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class ModuleSessionController
{
    public function login(Request $request, string $module, TokenIssuer $issuer, SessionData $sessions): JsonResponse
    {
        $adapter = app(ModuleSessions::class)->for($module);
        $identifier = $adapter->credentialField();
        $input = $request->validate([$identifier => 'required|string|max:191', 'password' => 'required|string|max:72']);
        $resolved = $adapter->resolveLogin(preg_replace('/\\s+/', '', trim($input[$identifier])));
        $user = isset($resolved['userId']) ? User::find($resolved['userId']) : null;
        abort_unless($user && Hash::check($input['password'], $user->password_hash), 401, 'Kode akun atau password salah.');
        abort_unless($user->is_active, 403, 'Akun ini nonaktif. Hubungi admin.');
        $registered = DB::table('modules')->where('slug', $module)->first();
        abort_unless($registered && ($registered->is_active || $user->is_superadmin), 403, 'Program belum dibuka. Hubungi admin.');
        $session = $sessions->forUser($user);
        $next = $adapter->redirect($session, $resolved['membership'] ?? null);
        $token = $issuer->issue($user);

        return response()->json(['ok' => true, 'redirectTo' => $next, 'nextPath' => $next, 'data' => $session])
            ->withCookie(cookie('sip_session', $token->plainTextToken, 10080, '/', null, config('frontend.secure_cookie'), true, false, 'lax'));
    }

    public function viewer(Request $request, string $module, SessionData $sessions): JsonResponse
    {
        $adapter = app(ModuleSessions::class)->for($module);

        return response()->json(['data' => $adapter->viewer($request, $sessions->forUser($request->user()))]);
    }

    public function availability(): JsonResponse
    {
        $registry = app(ModuleSessions::class);

        return response()->json(['data' => $registry->has('academy') && $registry->for('academy')->available()]);
    }
}
