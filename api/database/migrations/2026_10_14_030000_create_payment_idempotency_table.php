<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_idempotency', function (Blueprint $table): void {
            $table->string('scope', 64);
            $table->string('key_hash', 64);
            $table->string('fingerprint', 64);
            $table->string('transaction_id', 191)->nullable();
            $table->timestamps();
            $table->primary(['scope', 'key_hash']);
        });
    }

    public function down(): void
    {
        throw new LogicException('Payment deduplication records must not be discarded by rollback.');
    }
};
