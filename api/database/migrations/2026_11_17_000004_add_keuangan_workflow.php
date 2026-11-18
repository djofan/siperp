<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('keuangan_expenses', fn (Blueprint $t) => $t->unsignedInteger('revision')->default(1));
        Schema::table('keuangan_approvals', function (Blueprint $t): void {
            $t->unsignedInteger('revision')->default(1);
            $t->timestamp('cancelled_at')->nullable();
            $t->string('cancel_reason', 20)->nullable();
            // Keep an expense FK-supporting index before replacing its old unique index on MySQL.
            $t->index('expense_id', 'keuangan_approvals_expense_history_idx');
            $t->dropUnique(['expense_id', 'assigned_user_id']);
            $t->unique(['expense_id', 'revision', 'assigned_user_id'], 'keuangan_approval_revision_unique');
        });
        Schema::create('keuangan_expense_events', function (Blueprint $t): void {
            $t->uuid('id')->primary();
            $t->string('expense_id', 191);
            $t->string('actor_id', 191);
            $t->unsignedInteger('revision');
            $t->string('action', 30);
            $t->text('reason')->nullable();
            $t->json('changes');
            $t->timestamp('recorded_at');
            $t->foreign('expense_id')->references('id')->on('keuangan_expenses')->restrictOnDelete();
            $t->foreign('actor_id')->references('id')->on('users')->restrictOnDelete();
        });
        Schema::create('keuangan_requests', function (Blueprint $t): void {
            $t->uuid('id')->primary();
            $t->string('actor_id', 191);
            $t->uuid('request_id');
            $t->string('operation', 255);
            $t->string('fingerprint', 64);
            $t->json('result');
            $t->timestamp('created_at');
            $t->unique(['actor_id', 'request_id']);
            $t->foreign('actor_id')->references('id')->on('users')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        if (DB::table('keuangan_expense_events')->exists() || DB::table('keuangan_requests')->exists() || DB::table('keuangan_approvals')->where('revision', '>', 1)->orWhereNotNull('cancelled_at')->exists()) {
            throw new RuntimeException('Data/revisi Keuangan sudah ada. Gunakan rollback kode dengan schema tetap.');
        }
        Schema::dropIfExists('keuangan_requests');
        Schema::dropIfExists('keuangan_expense_events');
        Schema::table('keuangan_approvals', function (Blueprint $t): void {
            $t->dropUnique('keuangan_approval_revision_unique');
            $t->unique(['expense_id', 'assigned_user_id']);
            $t->dropIndex('keuangan_approvals_expense_history_idx');
            $t->dropColumn(['revision', 'cancelled_at', 'cancel_reason']);
        });
        Schema::table('keuangan_expenses', fn (Blueprint $t) => $t->dropColumn('revision'));
    }
};
