<?php

use App\Modules\Core\Auth\AccountCodes;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::table('users')->where('is_superadmin', true)->count() > 1) {
            throw new RuntimeException('Terdapat lebih dari satu superadmin. Tentukan satu pemilik SASIP01 sebelum menjalankan migrasi.');
        }
        DB::transaction(function () {
            $adminIds = DB::table('module_access')->where('role', 'admin')->pluck('user_id');
            $users = DB::table('users')->where('is_superadmin', true)->orWhereIn('id', $adminIds)->orderBy('created_at')->orderBy('id')->get();
            foreach ($users as $user) {
                $code = $user->is_superadmin ? 'SASIP01' : (preg_match('/^(?:ASIP|AMSIP)\d{4,}$/D', $user->code) ? $user->code : AccountCodes::next('admin'));
                AccountCodes::register($user->id, $code);
                DB::table('users')->where('id', $user->id)->update(['code' => $code]);
                DB::table('user_login_codes')->where('user_id', $user->id)->where('code', '!=', $code)
                    ->when(! $user->is_superadmin, fn ($query) => $query->where('code', $user->code))->delete();
            }
        });
        if (! Schema::hasColumn('users', 'superadmin_slot')) {
            Schema::table('users', function (Blueprint $table) {
                // A unique nullable generated value also prevents concurrent second-superadmin inserts.
                $table->unsignedTinyInteger('superadmin_slot')->nullable()->virtualAs('CASE WHEN is_superadmin = 1 THEN 1 ELSE NULL END')->unique();
            });
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique('users_superadmin_slot_unique');
            $table->dropColumn('superadmin_slot');
        });
        // Codes are identity references and are intentionally retained on rollback.
    }
};
