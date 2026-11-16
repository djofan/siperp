<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('zakat_academy_quiz_questions', function (Blueprint $table) {
            $table->string('media_path', 500)->nullable();
            $table->string('media_mime', 100)->nullable();
            $table->string('media_name', 191)->nullable();
            $table->string('media_alt', 500)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('zakat_academy_quiz_questions', function (Blueprint $table) {
            $table->dropColumn(['media_path', 'media_mime', 'media_name', 'media_alt']);
        });
    }
};
