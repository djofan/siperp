<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lazsip_beneficiaries', function (Blueprint $table): void {
            $table->string('handover_photo', 191)->nullable();
            $table->string('certificate_photo', 191)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('lazsip_beneficiaries', function (Blueprint $table): void {
            $table->dropColumn(['handover_photo', 'certificate_photo']);
        });
    }
};
