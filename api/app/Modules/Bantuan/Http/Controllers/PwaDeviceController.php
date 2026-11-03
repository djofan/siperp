<?php

namespace App\Modules\Bantuan\Http\Controllers;

use App\Modules\Bantuan\Http\Resources\PwaPushContextResource;
use App\Modules\Bantuan\Services\PwaPushSettings;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PwaDeviceController
{
    public function context(Request $request, PwaPushSettings $settings)
    {
        $session = $settings->session($request);
        $public = $settings->publicConfig();

        return (new PwaPushContextResource([
            'enabled' => $public !== null,
            'registered' => DB::table('bantuan_pwa_devices')->where('access_token_id', $session->id)->exists(),
            'userId' => $request->user()->id, 'binding' => $settings->binding($session->id),
            'firebase' => $public['firebase'] ?? null, 'vapidKey' => $public['vapidKey'] ?? null,
        ]))->response()->header('Cache-Control', 'no-store, private');
    }

    public function store(Request $request, PwaPushSettings $settings)
    {
        $session = $settings->session($request);
        abort_unless($settings->publicConfig(), 503, 'Push PWA belum dikonfigurasi oleh pengelola.');
        $data = $request->validate(['token' => 'required|string|max:4096']);
        $hash = hash('sha256', $data['token']);
        DB::transaction(function () use ($request, $session, $data, $hash) {
            DB::table('bantuan_pwa_devices')->where('access_token_id', $session->id)->where('token_hash', '!=', $hash)->delete();
            $old = DB::table('bantuan_pwa_devices')->where('token_hash', $hash)->lockForUpdate()->first();
            DB::table('bantuan_pwa_devices')->updateOrInsert(['token_hash' => $hash], [
                'user_id' => $request->user()->id, 'access_token_id' => $session->id,
                'token' => encrypt($data['token']),
                'created_at' => $old && $old->access_token_id === $session->id ? $old->created_at : now(),
                'updated_at' => now(),
            ]);
        });

        return response()->noContent();
    }

    public function destroy(Request $request, PwaPushSettings $settings)
    {
        DB::table('bantuan_pwa_devices')->where('access_token_id', $settings->session($request)->id)->delete();

        return response()->noContent();
    }
}
