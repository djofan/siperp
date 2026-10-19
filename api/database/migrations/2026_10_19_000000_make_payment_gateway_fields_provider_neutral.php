<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('payment_transactions', 'midtrans_order_id')) {
            Schema::table('payment_transactions', function (Blueprint $table): void {
                $table->renameColumn('midtrans_order_id', 'gateway_reference_id');
            });
        }
        if (Schema::hasColumn('payment_transactions', 'gateway_merchant_id')) {
            Schema::table('payment_transactions', function (Blueprint $table): void {
                $table->renameColumn('gateway_merchant_id', 'gateway_account_id');
            });
        }
        Schema::table('payment_transactions', function (Blueprint $table): void {
            $table->string('gateway_session_id', 191)->nullable()->after('gateway_reference_id');
            $table->string('gateway_transaction_id', 191)->nullable()->unique()->after('gateway_session_id');
        });
    }

    public function down(): void
    {
        Schema::table('payment_transactions', function (Blueprint $table): void {
            $table->dropUnique(['gateway_transaction_id']);
            $table->dropColumn(['gateway_session_id', 'gateway_transaction_id']);
            $table->renameColumn('gateway_reference_id', 'midtrans_order_id');
            $table->renameColumn('gateway_account_id', 'gateway_merchant_id');
        });
    }
};
