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
                $blueprint->string('mime', 255)->change();
            });
        }
    }

    public function down(): void
    {
        // Preserve the wider column: shrinking would truncate existing Office MIME values.
    }
};
