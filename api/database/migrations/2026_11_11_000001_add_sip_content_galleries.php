<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        foreach (['sip_program_bantuan', 'sip_news', 'sip_penyaluran_bantuan'] as $table) {
            Schema::table($table, function (Blueprint $table) { $table->json('documentation_photos')->nullable(); });
        }
    }
    public function down(): void
    {
        foreach (['sip_program_bantuan', 'sip_news', 'sip_penyaluran_bantuan'] as $table) {
            Schema::table($table, function (Blueprint $table) { $table->dropColumn('documentation_photos'); });
        }
    }
};
