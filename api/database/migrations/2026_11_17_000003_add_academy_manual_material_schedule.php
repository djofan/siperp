<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('zakat_academy_lessons', function (Blueprint $table): void {
            $table->dateTime('dashboard_opens_at')->nullable();
            $table->dateTime('dashboard_closes_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('zakat_academy_lessons', fn (Blueprint $table) => $table->dropColumn(['dashboard_opens_at', 'dashboard_closes_at']));
    }
};
