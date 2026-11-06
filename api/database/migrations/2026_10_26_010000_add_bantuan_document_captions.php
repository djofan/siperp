<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bantuan_documents', function (Blueprint $table) {
            $table->text('caption')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('bantuan_documents', fn (Blueprint $table) => $table->dropColumn('caption'));
    }
};
