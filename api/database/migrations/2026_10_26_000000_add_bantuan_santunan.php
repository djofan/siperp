<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bantuan_santunan', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('number')->unique();
            $table->string('frequency');
            $table->string('category');
            $table->date('period');
            $table->text('recipient');
            $table->string('volunteer_id', 191)->index();
            $table->unsignedBigInteger('amount');
            $table->string('transfer_status')->default('pending')->index();
            $table->string('distribution_status')->default('process')->index();
            $table->timestamp('transferred_at')->nullable();
            $table->string('transferred_by', 191)->nullable();
            $table->text('report')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->string('completed_by', 191)->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
        });

        Schema::create('bantuan_santunan_documents', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('santunan_id')->index();
            $table->string('kind');
            $table->string('path');
            $table->string('mime', 40);
            $table->string('uploaded_by', 191);
            $table->timestamp('created_at');
            $table->unique(['santunan_id', 'kind']);
        });

        Schema::create('bantuan_santunan_events', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('santunan_id')->index();
            $table->string('actor_id', 191);
            $table->string('actor_role');
            $table->string('action');
            $table->text('details');
            $table->timestamp('created_at')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bantuan_santunan_events');
        Schema::dropIfExists('bantuan_santunan_documents');
        Schema::dropIfExists('bantuan_santunan');
    }
};
