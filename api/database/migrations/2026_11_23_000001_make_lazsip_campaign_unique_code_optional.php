<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lazsip_campaigns', function (Blueprint $table) {
            $table->string('unique_code', 191)->nullable()->change();
        });
    }

    public function down(): void
    {
        if (DB::table('lazsip_campaigns')->whereNull('unique_code')->exists()) {
            throw new RuntimeException('Cannot require campaign codes while campaigns without codes exist. No campaign data was changed.');
        }
        Schema::table('lazsip_campaigns', function (Blueprint $table) {
            $table->string('unique_code', 191)->nullable(false)->change();
        });
    }
};
