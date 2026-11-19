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
        Schema::create('keuangan_programs', function (Blueprint $table): void {
            $table->string('id', 191)->primary();
            $table->string('name', 255);
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
        });
        Schema::table('keuangan_expenses', function (Blueprint $table): void {
            $table->string('program_id', 191)->nullable();
            $table->date('requested_on')->nullable();
            $table->text('recipient_identity')->nullable();
            $table->string('treasurer_id', 191)->nullable();
            $table->foreign('program_id')->references('id')->on('keuangan_programs')->restrictOnDelete();
            $table->foreign('treasurer_id')->references('id')->on('users')->restrictOnDelete();
        });
        $this->importLegacyPrograms();
        foreach (['categories' => ['Cash Advance', 'Kegiatan Sosial', 'Operasional', 'Lain-lain'], 'sources' => ['Kas Infaq', 'Kas Amil', 'Kas Riba']] as $kind => $names) {
            foreach ($names as $name) {
                if (! DB::table('keuangan_'.$kind)->whereNull('archived_at')->whereRaw('LOWER(TRIM(name)) = ?', [mb_strtolower($name)])->exists()) {
                    DB::table('keuangan_'.$kind)->insert(['id' => (string) Str::uuid(), 'name' => $name, 'created_at' => now()->utc(), 'updated_at' => now()->utc()]);
                }
            }
        }
    }

    public function importLegacyPrograms(): void
    {
        // Legacy categories carried program names. Keep their IDs and all transaction history.
        $programs = [];
        foreach (DB::table('keuangan_categories')->orderBy('id')->get() as $category) {
            $name = trim($category->name);
            if ($name === '') {
                continue;
            }
            $key = mb_strtolower($name);
            if (! isset($programs[$key])) {
                $programs[$key] = DB::table('keuangan_programs')->whereRaw('LOWER(TRIM(name)) = ?', [$key])->value('id') ?? (string) Str::uuid();
                DB::table('keuangan_programs')->insertOrIgnore(['id' => $programs[$key], 'name' => $name, 'created_at' => now()->utc(), 'updated_at' => now()->utc()]);
            }
            DB::table('keuangan_expenses')->where('category_id', $category->id)->whereNull('program_id')->update(['program_id' => $programs[$key]]);
        }
    }

    public function down(): void
    {
        // No destructive automatic rollback after applications have started using these fields.
    }
};
