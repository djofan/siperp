<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bantuan_staff', function (Blueprint $table) {
            $table->text('phone')->nullable(); // Laravel-encrypted, never a plaintext phone.
            $table->boolean('whatsapp_enabled')->default(false);
        });
        Schema::create('bantuan_whatsapp_outbox', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('notification_id')->unique();
            $table->string('user_id', 191)->index();
            $table->uuid('application_id')->index();
            $table->string('application_status', 50);
            $table->string('status', 20)->default('pending');
            $table->unsignedTinyInteger('attempts')->default(0);
            $table->string('last_error', 80)->nullable();
            $table->timestamp('available_at');
            $table->timestamp('claimed_at')->nullable();
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();
            $table->index(['status', 'available_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bantuan_whatsapp_outbox');
        Schema::table('bantuan_staff', fn (Blueprint $table) => $table->dropColumn(['phone', 'whatsapp_enabled']));
    }
};
