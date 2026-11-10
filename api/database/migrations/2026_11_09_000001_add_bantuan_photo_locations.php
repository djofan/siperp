<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['bantuan_documents', 'bantuan_santunan_documents'] as $table) {
            Schema::table($table, function (Blueprint $blueprint) {
                $blueprint->text('photo_location')->nullable();
            });
        }
    }

    public function down(): void
    {
        foreach (['bantuan_documents', 'bantuan_santunan_documents'] as $table) {
            Schema::table($table, fn (Blueprint $blueprint) => $blueprint->dropColumn('photo_location'));
        }
    }
};
