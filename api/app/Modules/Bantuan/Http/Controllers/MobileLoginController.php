<?php

namespace App\Modules\Bantuan\Http\Controllers;

use App\Modules\Bantuan\Http\Resources\MobileTokenResource;
use App\Modules\Core\Auth\AccountCodes;
use App\Modules\Core\Auth\TokenIssuer;
use App\Modules\Core\Http\Middleware\RequireModuleAccess;
use App\Modules\Core\Http\Requests\LoginRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class MobileLoginController
{
    public function __invoke(LoginRequest $request, TokenIssuer $issuer, RequireModuleAccess $access): JsonResponse
    {
        $user = AccountCodes::find($request->validated('code'));
        abort_unless($user && $user->is_active && Hash::check($request->validated('password'), $user->password_hash), 401, 'Kode akun atau password salah.');

        // Login has no authenticated token yet. Authorize the verified account
        // with the same live module policy used by subsequent Bearer requests.
        abort_unless(DB::table('modules')->where('slug', 'bantuan')->exists(), 403, 'Akses modul Bantuan diperlukan.');
        $request->setUserResolver(fn () => $user);

        return $access->handle($request, function () use ($user, $issuer) {
            return (new MobileTokenResource($issuer->issue($user, 'bantuan-mobile')))
                ->response()->header('Cache-Control', 'no-store');
        }, 'bantuan');
    }
}
