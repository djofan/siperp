<?php

use App\Modules\Bantuan\Services\Access;
use App\Modules\Bantuan\Services\Whatsapp;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;

Route::get('whatsapp/status', function (Request $request, Access $access, Whatsapp $whatsapp) {
    $access->allow($request, []);
    return response()->json(['data' => [
        'configured' => $whatsapp->configured(),
        'counts' => DB::table('bantuan_whatsapp_outbox')->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status'),
        'recent' => DB::table('bantuan_whatsapp_outbox')->orderByDesc('updated_at')->limit(30)
            ->get(['id', 'status', 'attempts', 'last_error', 'sent_at', 'updated_at']),
    ]]);
});
