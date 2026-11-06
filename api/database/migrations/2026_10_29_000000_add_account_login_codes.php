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
        if (! Schema::hasColumn('users', 'code')) {
            Schema::table('users', fn (Blueprint $table) => $table->string('code', 32)->nullable()->unique());
        }
        if (! Schema::hasTable('user_login_codes')) {
            Schema::create('user_login_codes', function (Blueprint $table) {
                $table->string('code', 32)->primary();
                $table->string('user_id', 191)->index();
                $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            });
        }

        DB::transaction(function () {
            // Optional legacy profiles are inspected only during migration, never during Core login.
            foreach ([['teknisi_participants', 'userId', 'nip'], ['zakat_academy_profiles', 'user_id', 'nis'],
                ['tanwir_members', 'user_id', 'code'], ['ojol_members', 'user_id', 'code']] as [$table, $owner, $column]) {
                if (! Schema::hasTable($table)) continue;
                foreach (DB::table($table)->whereNotNull($column)->orderBy('id')->get([$owner, $column]) as $profile) {
                    if (! DB::table('users')->where('id', $profile->$owner)->exists()) continue;
                    $code = AccountCodes::normalize($profile->$column);
                    if (! AccountCodes::valid($code)) continue;
                    AccountCodes::register($profile->$owner, $code);
                    DB::table('users')->where('id', $profile->$owner)->whereNull('code')->update(['code' => $code]);
                }
            }
            DB::table('users')->orderBy('created_at')->orderBy('id')->chunk(200, function ($users) {
                foreach ($users as $user) {
                    $code = $user->code ?: AccountCodes::next();
                    AccountCodes::register($user->id, $code);
                    DB::table('users')->where('id', $user->id)->update(['code' => $code]);
                }
            });
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_login_codes');
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique('users_code_unique');
            $table->dropColumn('code');
        });
    }
};
