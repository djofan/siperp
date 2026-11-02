<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('bantuan_applications', fn (Blueprint $table) => $table->text('survey_location')->nullable());
    }

    public function down(): void
    {
        Schema::table('bantuan_applications', fn (Blueprint $table) => $table->dropColumn('survey_location'));
    }
};
