<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bantuan_santunan', function (Blueprint $table): void {
            $table->string('companion_id', 191)->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::table('bantuan_santunan', function (Blueprint $table): void {
            $table->dropIndex(['companion_id']);
            $table->dropColumn('companion_id');
        });
    }
};
