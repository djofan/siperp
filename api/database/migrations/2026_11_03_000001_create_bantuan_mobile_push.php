<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bantuan_mobile_devices', function (Blueprint $t) {
            $t->char('token_hash', 64)->primary();
            $t->string('user_id')->index();
            $t->string('access_token_id')->index();
            $t->text('token');
            $t->timestamp('created_at');
        });
        Schema::create('bantuan_mobile_deliveries', function (Blueprint $t) {
            $t->string('notification_id', 36);
            $t->char('token_hash', 64);
            $t->string('access_token_id', 36);
            $t->timestamp('sent_at')->index();
            $t->primary(['notification_id', 'token_hash', 'access_token_id'], 'bantuan_mobile_deliveries_pk');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bantuan_mobile_deliveries');
        Schema::dropIfExists('bantuan_mobile_devices');
    }
};
