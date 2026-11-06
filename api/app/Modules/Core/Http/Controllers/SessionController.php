<?php

namespace App\Modules\Core\Http\Controllers;

use App\Modules\Core\Auth\SessionData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SessionController
{
    public function password(Request $request): JsonResponse
    {
        $input = $request->validate([
            'current_password' => ['required', 'string', 'current_password:sanctum'],
            'password' => ['required', 'string', 'min:12', 'max:128', 'confirmed', 'different:current_password'],
        ]);
        $request->user()->forceFill(['password_hash' => \Illuminate\Support\Facades\Hash::make($input['password'])])->save();
        $current = $request->user()->currentAccessToken();
        $tokens = $request->user()->tokens();
        if ($current) $tokens->where('id', '!=', $current->id);
        $tokens->delete();
        return response()->json(['data'=>['message'=>'Password berhasil diubah. Sesi pada perangkat lain telah diakhiri.']]);
    }

    public function show(Request $request, SessionData $sessions): JsonResponse
    {
        return response()->json(['data' => $sessions->forUser($request->user())]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['ok' => true])->withCookie(cookie()->forget('sip_session'));
    }
}
