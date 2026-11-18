<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('keuangan_import_batches', function (Blueprint $t): void {
            $t->uuid('id')->primary();
            $t->string('origin', 100);
            $t->string('snapshot_hash', 64);
            $t->string('dump_hash', 64);
            $t->string('mapping_hash', 64);
            $t->string('timezone', 100);
            $t->json('summary');
            $t->timestamp('completed_at');
        });
        Schema::create('keuangan_legacy_links', function (Blueprint $t): void {
            $t->string('id', 64)->primary();
            $t->string('origin', 100);
            $t->string('legacy_table', 50);
            $t->string('legacy_id', 191);
            $t->string('target_id', 191);
            $t->string('source_hash', 64);
            $t->string('target_hash', 64);
            $t->uuid('batch_id');
            $t->unique(['origin', 'legacy_table', 'legacy_id'], 'keuangan_legacy_identity_unique');
            $t->foreign('batch_id')->references('id')->on('keuangan_import_batches')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        if (DB::table('keuangan_import_batches')->exists()) {
            throw new RuntimeException('Impor historis sudah ada; pertahankan schema dan provenance.');
        }
        Schema::dropIfExists('keuangan_legacy_links');
        Schema::dropIfExists('keuangan_import_batches');
    }
};
