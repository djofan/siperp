<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lazsip_articles', function (Blueprint $table) {
            $table->string('id', 191)->primary();
            $table->string('title', 191);
            $table->longText('content');
            $table->string('author', 191)->nullable();
            $table->text('source')->nullable();
            $table->string('category', 30)->nullable();
            $table->string('status', 20)->default('draft');
            $table->timestamp('created_at')->useCurrent();
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lazsip_articles');
    }
};
