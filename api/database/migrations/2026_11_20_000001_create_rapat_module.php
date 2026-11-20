<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rapat_meetings', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->string('created_by', 191)->index();
            $t->date('meeting_date')->index();
            $t->string('status', 20)->default('draft');
            $t->longText('payload');
            $t->unsignedInteger('version')->default(1);
            $t->timestamp('archived_at')->nullable();
            $t->uuid('run_token')->nullable();
            $t->timestamp('run_started_at')->nullable();
            $t->timestamps();
        });
        Schema::create('rapat_media', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignUuid('meeting_id')->constrained('rapat_meetings')->restrictOnDelete();
            $t->uuid('client_id');
            $t->unsignedInteger('sequence');
            $t->longText('payload');
            $t->string('path');
            $t->string('mime', 100);
            $t->unsignedInteger('size');
            $t->boolean('transcribed')->default(false);
            $t->softDeletes();
            $t->timestamps();
            $t->unique(['meeting_id', 'client_id']);
        });
        Schema::create('rapat_settings', function (Blueprint $t) {
            $t->unsignedInteger('id')->primary();
            $t->longText('payload');
        });
        Schema::create('rapat_jobs', function (Blueprint $t) {
            $t->bigIncrements('id');
            $t->string('queue')->index();
            $t->longText('payload');
            $t->unsignedTinyInteger('attempts');
            $t->unsignedInteger('reserved_at')->nullable();
            $t->unsignedInteger('available_at');
            $t->unsignedInteger('created_at');
        });
        DB::table('modules')->insertOrIgnore(['id' => 'module-rapat', 'slug' => 'rapat', 'name' => 'Rapat', 'description' => 'Notulen rapat dengan AI lokal privat', 'is_active' => true]);
    }

    public function down(): void
    {
        DB::table('modules')->where('slug', 'rapat')->update(['is_active' => false]);
        foreach (['rapat_jobs', 'rapat_settings', 'rapat_media', 'rapat_meetings'] as $table) {
            Schema::dropIfExists($table);
        }
    }
};
