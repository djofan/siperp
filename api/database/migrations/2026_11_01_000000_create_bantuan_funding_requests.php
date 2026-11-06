<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bantuan_funding_requests', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->string('number')->unique();
            $t->string('title', 191);
            $t->text('notes')->nullable();
            $t->string('status')->default('submitted')->index();
            $t->unsignedBigInteger('total_amount');
            $t->unsignedInteger('version')->default(1);
            $t->string('created_by', 191)->index();
            $t->string('decided_by', 191)->nullable();
            $t->text('reason')->nullable();
            $t->timestamp('decided_at')->nullable();
            $t->timestamps();
        });
        Schema::create('bantuan_funding_request_items', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignUuid('funding_request_id')->constrained('bantuan_funding_requests')->restrictOnDelete();
            $t->foreignUuid('application_id')->constrained('bantuan_applications')->restrictOnDelete();
            // NULL after a decision: history remains, while a later funding cycle can create a new batch.
            $t->uuid('active_application_id')->nullable()->unique();
            $t->string('number');
            $t->string('name');
            $t->string('program');
            $t->string('region');
            $t->unsignedBigInteger('amount');
            $t->unsignedInteger('submitted_version');
            $t->unsignedInteger('decision_version')->nullable();
            $t->unique(['funding_request_id', 'application_id'], 'bantuan_funding_item_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bantuan_funding_request_items');
        Schema::dropIfExists('bantuan_funding_requests');
    }
};
