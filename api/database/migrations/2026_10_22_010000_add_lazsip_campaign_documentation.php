<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lazsip_campaigns', function (Blueprint $table): void {
            $table->json('documentation_photos')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('lazsip_campaigns', function (Blueprint $table): void {
            $table->dropColumn('documentation_photos');
        });
    }
};
