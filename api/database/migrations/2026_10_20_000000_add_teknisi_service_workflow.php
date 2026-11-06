<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('teknisi_service_details', function (Blueprint $table) {
            $table->string('id', 191)->primary();
            $table->string('ticketId', 191)->unique();
            $table->string('serviceType', 20)->default('normal');
            $table->string('warrantyParentId', 191)->nullable()->index();
            $table->text('diagnosis')->nullable();
            $table->text('treatment')->nullable();
            $table->unsignedBigInteger('capital')->nullable();
            $table->unsignedBigInteger('finalPrice')->nullable();
            $table->unsignedInteger('warrantyDays')->default(0);
            $table->dateTime('startedAt', 3)->nullable();
            $table->dateTime('readyAt', 3)->nullable();
            $table->dateTime('collectedAt', 3)->nullable();
            $table->dateTime('warrantyUntil', 3)->nullable();
            $table->string('paymentMethod', 20)->nullable();
            $table->string('receiverName', 191)->nullable();
            $table->string('receiverPhone', 30)->nullable();
            $table->text('cancelReason')->nullable();
            $table->foreign('ticketId')->references('id')->on('teknisi_tickets')->cascadeOnDelete();
        });
        Schema::create('teknisi_service_media', function (Blueprint $table) {
            $table->string('id', 191)->primary();
            $table->string('ticketId', 191)->index();
            $table->string('stage', 30);
            $table->string('path');
            $table->string('mime', 50);
            $table->foreign('ticketId')->references('id')->on('teknisi_tickets')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('teknisi_service_media');
        Schema::dropIfExists('teknisi_service_details');
    }
};
