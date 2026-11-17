<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('academy_cohorts', fn (Blueprint $table) => $table->date('dashboard_starts_on')->nullable());
    }

    public function down(): void
    {
        Schema::table('academy_cohorts', fn (Blueprint $table) => $table->dropColumn('dashboard_starts_on'));
    }
};
