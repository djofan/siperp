<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('zakat_academy_quizzes')->where('allow_retake', true)->update(['allow_retake' => false]);
    }

    public function down(): void
    {
        // Retakes must not be granted globally when rolling back.
    }
};
