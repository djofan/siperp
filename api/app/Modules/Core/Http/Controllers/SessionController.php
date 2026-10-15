<?php

namespace App\Modules\Core\Http\Controllers;

use App\Modules\Core\Auth\SessionData;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SessionController
{
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
