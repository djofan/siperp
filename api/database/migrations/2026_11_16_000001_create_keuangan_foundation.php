<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        foreach (['sources', 'categories'] as $master) {
            Schema::create('keuangan_'.$master, function (Blueprint $table): void {
                $table->string('id', 191)->primary();
                $table->string('name', 255);
                $table->timestamp('archived_at')->nullable();
                $table->timestamps();
            });
        }
        Schema::create('keuangan_expenses', function (Blueprint $table): void {
            $table->string('id', 191)->primary();
            $table->string('source_id', 191);
            $table->string('category_id', 191);
            $table->string('recipient', 255);
            $table->unsignedBigInteger('amount');
            $table->text('description');
            $table->string('created_by', 191)->nullable();
            $table->string('origin', 20)->default('native');
            $table->unsignedInteger('version')->default(1);
            $table->timestamp('archived_at')->nullable();
            $table->timestamps();
            $table->foreign('source_id')->references('id')->on('keuangan_sources')->restrictOnDelete();
            $table->foreign('category_id')->references('id')->on('keuangan_categories')->restrictOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->restrictOnDelete();
            $table->index(['archived_at', 'created_at', 'id']);
        });
        Schema::create('keuangan_approval_rules', function (Blueprint $table): void {
            $table->string('id', 191)->primary();
            $table->unsignedBigInteger('min_amount');
            $table->unsignedBigInteger('max_amount');
            $table->boolean('active')->default(true);
            $table->unsignedInteger('version')->default(1);
            $table->timestamps();
        });
        Schema::create('keuangan_rule_approvers', function (Blueprint $table): void {
            $table->string('rule_id', 191);
            $table->string('user_id', 191);
            $table->primary(['rule_id', 'user_id']);
            $table->foreign('rule_id')->references('id')->on('keuangan_approval_rules')->restrictOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->restrictOnDelete();
        });
        Schema::create('keuangan_approvals', function (Blueprint $table): void {
            $table->string('id', 191)->primary();
            $table->string('expense_id', 191);
            $table->string('assigned_user_id', 191);
            $table->enum('decision', ['waiting', 'approved', 'rejected'])->default('waiting');
            $table->text('note')->nullable();
            $table->json('rule_snapshot')->nullable();
            $table->unsignedInteger('version')->default(1);
            $table->timestamp('legacy_updated_at')->nullable();
            $table->timestamps();
            $table->unique(['expense_id', 'assigned_user_id']);
            $table->index(['assigned_user_id', 'decision']);
            $table->foreign('expense_id')->references('id')->on('keuangan_expenses')->restrictOnDelete();
            $table->foreign('assigned_user_id')->references('id')->on('users')->restrictOnDelete();
        });
        Schema::create('keuangan_approval_events', function (Blueprint $table): void {
            $table->string('id', 191)->primary();
            $table->string('approval_id', 191);
            $table->string('actor_id', 191)->nullable();
            $table->string('action', 50);
            $table->string('origin', 20);
            $table->json('changes');
            $table->text('reason')->nullable();
            $table->timestamp('recorded_at');
            $table->foreign('approval_id')->references('id')->on('keuangan_approvals')->restrictOnDelete();
            $table->foreign('actor_id')->references('id')->on('users')->restrictOnDelete();
        });
        // Do not activate, grant accounts, seed transactions or touch Core finance.
        DB::table('modules')->insertOrIgnore([
            'id' => 'module-keuangan', 'slug' => 'keuangan', 'name' => 'Keuangan',
            'description' => 'Pencatatan pengeluaran dan persetujuan internal.', 'is_active' => false,
        ]);
    }

    public function down(): void
    {
        // Keep registration and grants, but do not expose a module without its schema.
        DB::table('modules')->where('slug', 'keuangan')->update(['is_active' => false]);
        foreach (['approval_events', 'approvals', 'rule_approvers', 'approval_rules', 'expenses', 'categories', 'sources'] as $table) {
            Schema::dropIfExists('keuangan_'.$table);
        }
    }
};
