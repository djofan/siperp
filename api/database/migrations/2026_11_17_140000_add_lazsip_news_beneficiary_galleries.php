<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['lazsip_news', 'lazsip_beneficiaries'] as $name) {
            Schema::table($name, fn (Blueprint $table) => $table->json('documentation_photos')->nullable());
        }
    }

    public function down(): void
    {
        foreach (['lazsip_news', 'lazsip_beneficiaries'] as $name) {
            Schema::table($name, fn (Blueprint $table) => $table->dropColumn('documentation_photos'));
        }
    }
};
