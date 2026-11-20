<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rapat_revisions', function (Blueprint $t) {
            $t->uuid('id')->primary();
            $t->foreignUuid('meeting_id')->constrained('rapat_meetings')->restrictOnDelete();
            $t->unsignedInteger('version');
            $t->longText('payload');
            $t->timestamp('created_at');
            $t->unique(['meeting_id', 'version']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rapat_revisions');
    }
};
