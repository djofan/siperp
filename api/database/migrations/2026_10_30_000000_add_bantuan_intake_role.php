<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        if (! Schema::hasColumn('bantuan_applications', 'intake_role')) {
            Schema::table('bantuan_applications', fn (Blueprint $table) => $table->string('intake_role', 50)->nullable());
        }
        DB::table('bantuan_applications')->whereNull('intake_role')->update(['intake_role' => DB::raw(
            "(SELECT actor_role FROM bantuan_events WHERE application_id = bantuan_applications.id AND action = 'create' ORDER BY created_at, id LIMIT 1)"
        )]);
    }

    public function down(): void
    {
        Schema::table('bantuan_applications', fn (Blueprint $table) => $table->dropColumn('intake_role'));
    }
};
