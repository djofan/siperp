<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Standalone notifications were created only by the removed admin test tool.
        DB::table('bantuan_notifications')->whereNull('application_id')->delete();

        if (Schema::hasColumn('bantuan_notifications', 'is_test')) {
            Schema::table('bantuan_notifications', fn (Blueprint $table) => $table->dropColumn('is_test'));
        }
    }

    public function down(): void
    {
        if (! Schema::hasColumn('bantuan_notifications', 'is_test')) {
            Schema::table('bantuan_notifications', fn (Blueprint $table) => $table->boolean('is_test')->default(false));
        }
    }
};
