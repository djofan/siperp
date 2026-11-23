<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lazsip_affiliates', function (Blueprint $table): void {
            $table->string('referral_code', 20)->nullable()->unique();
        });
        DB::table('lazsip_affiliates')->whereNull('referral_code')->orderBy('id')->lazyById(100)->each(function ($row): void {
            do {
                $code = bin2hex(random_bytes(10));
            } while (DB::table('lazsip_affiliates')->where('referral_code', $code)->exists());
            DB::table('lazsip_affiliates')->where('id', $row->id)->whereNull('referral_code')->update(['referral_code' => $code]);
        });
    }

    public function down(): void
    {
        Schema::table('lazsip_affiliates', function (Blueprint $table): void {
            $table->dropUnique(['referral_code']);
            $table->dropColumn('referral_code');
        });
    }
};
