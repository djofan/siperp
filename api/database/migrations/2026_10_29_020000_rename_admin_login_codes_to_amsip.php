<?php

use App\Modules\Core\Auth\AccountCodes;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function () {
            DB::table('participant_sequences')->insertOrIgnore(['module_slug' => 'core-admin-login', 'last_number' => 0]);
            $counter = DB::table('participant_sequences')->where('module_slug', 'core-admin-login')->lockForUpdate()->first();
            foreach (DB::table('users')->where('is_superadmin', false)->where('code', 'like', 'ASIP%')->orderBy('id')->get() as $user) {
                if (! preg_match('/^ASIP\d{4,}$/D', $user->code)) continue;
                $code = 'AMSIP'.substr($user->code, 4);
                AccountCodes::register($user->id, $code);
                DB::table('users')->where('id', $user->id)->update(['code' => $code]);
                DB::table('user_login_codes')->where('user_id', $user->id)->where('code', $user->code)->delete();
            }
            $number = (int) $counter->last_number;
            foreach (DB::table('users')->where('code', 'like', 'AMSIP%')->pluck('code') as $code) {
                if (preg_match('/^AMSIP(\d{4,})$/D', $code, $match)) $number = max($number, (int) $match[1]);
            }
            DB::table('participant_sequences')->where('module_slug', 'core-admin-login')->update(['last_number' => $number]);
        });
    }

    public function down(): void
    {
        // Keep issued identity codes stable when rolling back application deployment.
    }
};
