<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('bantuan_mustahiq_profiles', function (Blueprint $table) {
            $table->string('nik_hash', 64)->primary();
            $table->string('name');
            $table->longText('applicant');
            $table->unsignedInteger('version')->default(1);
            $table->uuid('updated_by');
            $table->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('bantuan_mustahiq_profiles'); }
};
