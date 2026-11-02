<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bantuan_staff', function (Blueprint $t) {
            $t->string('user_id', 191)->primary();
            $t->string('region')->nullable();
            $t->boolean('can_bypass')->default(false);
        });
        Schema::create('bantuan_reporters', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->text('details');
            $t->timestamps();
        });
        Schema::create('bantuan_applications', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->string('number')->unique();
            $t->string('name');
            $t->string('nik_hash', 64)->index();
            $t->text('applicant');
            $t->uuid('reporter_id');
            $t->string('program');
            $t->string('region');
            $t->string('source');
            $t->string('status')->index();
            $t->string('created_by', 191)->index();
            $t->string('verifier_id', 191)->nullable()->index();
            $t->string('distributor_id', 191)->nullable()->index();
            $t->string('distribution_type')->nullable();
            $t->unsignedBigInteger('amount')->nullable();
            $t->text('bypass_reason')->nullable();
            $t->text('survey')->nullable();
            $t->text('handover')->nullable();
            $t->text('fund_reference')->nullable();
            $t->timestamp('disbursed_at')->nullable();
            $t->timestamp('completed_at')->nullable();
            $t->unsignedInteger('version')->default(1);
            $t->timestamps();
        });
        Schema::create('bantuan_documents', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->uuid('application_id')->index();
            $t->string('kind');
            $t->string('path');
            $t->string('mime', 40);
            $t->string('uploaded_by', 191);
            $t->timestamp('used_at')->nullable();
            $t->timestamp('created_at');
        });
        Schema::create('bantuan_events', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->uuid('application_id')->nullable()->index();
            $t->string('actor_id', 191);
            $t->string('actor_role');
            $t->string('action');
            $t->string('from_status')->nullable();
            $t->string('to_status')->nullable();
            $t->text('details');
            $t->timestamp('created_at')->index();
        });
        Schema::create('bantuan_notifications', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->string('user_id', 191)->index();
            $t->uuid('application_id');
            $t->string('message');
            $t->string('dedup_key')->nullable()->unique();
            $t->timestamp('read_at')->nullable();
            $t->timestamp('created_at');
        });
        Schema::create('bantuan_settings', function (Blueprint $t) {
            $t->string('key')->primary();
            $t->text('value');
        });
        DB::table('bantuan_settings')->insert(['key' => 'general', 'value' => json_encode([
            'programs' => ['Kebutuhan Pokok', 'Kesehatan', 'Pendidikan', 'Lainnya'],
            'regions' => [], 'housing' => ['Milik sendiri', 'Tinggalan orang tua', 'Kontrak-sewa', 'Menumpang', 'Lainnya'],
            'minimumSurveyPhotos' => 5, 'distributionDays' => 7, 'closingText' => '',
        ])]);
        DB::table('modules')->insertOrIgnore(['id' => (string) Str::uuid(), 'slug' => 'bantuan', 'name' => 'Pengajuan Bantuan', 'description' => 'Pengajuan, verifikasi, persetujuan dan penyaluran bantuan.', 'is_active' => true]);
    }

    public function down(): void
    {
        foreach (['bantuan_notifications', 'bantuan_events', 'bantuan_documents', 'bantuan_applications', 'bantuan_reporters', 'bantuan_staff', 'bantuan_settings'] as $table) {
            Schema::dropIfExists($table);
        }
        DB::table('modules')->where('slug', 'bantuan')->delete();
    }
};
