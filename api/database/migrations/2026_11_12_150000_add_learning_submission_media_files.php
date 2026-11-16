<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['tanwir_submissions', 'ojol_submissions'] as $table) {
            Schema::table($table, fn (Blueprint $blueprint) => $blueprint->json('media_files')->nullable());
        }
    }

    public function down(): void
    {
        foreach (['tanwir_submissions', 'ojol_submissions'] as $table) {
            Schema::table($table, fn (Blueprint $blueprint) => $blueprint->dropColumn('media_files'));
        }
    }
};
