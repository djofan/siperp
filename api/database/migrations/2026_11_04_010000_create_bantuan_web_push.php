<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bantuan_web_subscriptions', function (Blueprint $table) {
            $table->char('id', 64)->primary();
            $table->string('user_id', 191)->index();
            $table->string('access_token_id', 191)->index();
            $table->text('subscription');
            $table->timestamp('created_at');
        });
        Schema::create('bantuan_web_deliveries', function (Blueprint $table) {
            $table->char('subscription_id', 64);
            $table->string('notification_id', 36);
            $table->string('access_token_id', 191);
            $table->timestamp('sent_at')->index();
            $table->primary(['subscription_id', 'notification_id', 'access_token_id'], 'bantuan_web_deliveries_pk');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bantuan_web_deliveries');
        Schema::dropIfExists('bantuan_web_subscriptions');
    }
};
