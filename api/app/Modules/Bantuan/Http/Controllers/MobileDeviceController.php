<?php

namespace App\Modules\Bantuan\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MobileDeviceController
{
    private function session(Request $request)
    {
        $token = $request->user()->currentAccessToken();
        abort_unless($token && $token->name === 'bantuan-mobile', 403, 'Sesi mobile diperlukan.');

        return $token;
    }

    public function store(Request $request)
    {
        $access = $this->session($request);
        $data = $request->validate(['token' => ['required', 'string', 'max:4096']]);
        $hash = hash('sha256', $data['token']);
        DB::transaction(function () use ($access, $request, $data, $hash) {
            DB::table('bantuan_mobile_devices')->where('access_token_id', $access->id)->where('token_hash', '!=', $hash)->delete();
            $existing = DB::table('bantuan_mobile_devices')->where('token_hash', $hash)->lockForUpdate()->first();
            DB::table('bantuan_mobile_devices')->updateOrInsert(['token_hash' => $hash], [
                'access_token_id' => $access->id, 'user_id' => $request->user()->id,
                'token' => encrypt($data['token']),
                'created_at' => $existing && $existing->access_token_id === $access->id ? $existing->created_at : now(),
            ]);
        });

        return response()->noContent();
    }

    public function destroy(Request $request)
    {
        DB::table('bantuan_mobile_devices')->where('access_token_id', $this->session($request)->id)->delete();

        return response()->noContent();
    }

    public function logout(Request $request)
    {
        $token = $this->session($request);
        DB::transaction(function () use ($token) {
            DB::table('bantuan_mobile_devices')->where('access_token_id', $token->id)->delete();
            $token->delete();
        });

        return response()->noContent();
    }
}
