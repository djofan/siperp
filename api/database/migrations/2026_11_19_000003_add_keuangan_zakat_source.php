<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        if (! DB::table('keuangan_sources')->whereNull('archived_at')->whereRaw('LOWER(TRIM(name)) = ?', ['kas zakat'])->exists()) {
            DB::table('keuangan_sources')->insert([
                'id' => (string) Str::uuid(), 'name' => 'Kas Zakat',
                'created_at' => now()->utc(), 'updated_at' => now()->utc(),
            ]);
        }
    }

    public function down(): void
    {
        // Keep sources that may already be referenced by financial records.
    }
};
