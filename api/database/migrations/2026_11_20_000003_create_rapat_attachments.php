<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rapat_attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('meeting_id')->constrained('rapat_meetings')->restrictOnDelete();
            $table->text('name'); // Encrypted bounded original filename, never indexed/plaintext.
            $table->string('path');
            $table->string('mime', 150);
            $table->unsignedInteger('size');
            $table->timestamps();
            $table->softDeletes();
            $table->index(['meeting_id', 'deleted_at']);
        });
    }

    public function down(): void
    {
        throw new RuntimeException('Irreversible migration: private attachment metadata and files must be retained.');
    }
};
