<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Nullable storage preserves existing questions and imported participant accounts.
        // New questions and participant profile updates enforce requirements in the API.
        Schema::table('academy_discussions', function (Blueprint $table): void {
            $table->string('title', 191)->nullable();
        });
        Schema::table('zakat_academy_profiles', function (Blueprint $table): void {
            $table->string('profession', 191)->nullable();
            $table->text('expertise')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('academy_discussions', function (Blueprint $table): void {
            $table->dropColumn('title');
        });
        Schema::table('zakat_academy_profiles', function (Blueprint $table): void {
            $table->dropColumn(['profession', 'expertise']);
        });
    }
};
