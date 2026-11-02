<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('bantuan_staff', fn (Blueprint $table) => $table->text('roles')->nullable());
        Schema::create('bantuan_active_roles', function (Blueprint $table) {
            $table->string('session_key', 191)->primary();
            $table->string('user_id', 191)->index();
            $table->string('role', 50);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bantuan_active_roles');
        Schema::table('bantuan_staff', fn (Blueprint $table) => $table->dropColumn('roles'));
    }
};
