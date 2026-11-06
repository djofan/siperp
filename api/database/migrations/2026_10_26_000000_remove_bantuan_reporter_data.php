<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Remove only reporter snapshots; retain actors, statuses and other audit details.
        DB::transaction(function () {
            DB::table('bantuan_events')->orderBy('id')->chunkById(100, function ($events) {
                foreach ($events as $event) {
                    $details = json_decode(Crypt::decryptString($event->details), true, 512, JSON_THROW_ON_ERROR);
                    $clean = $this->withoutReporter($details);
                    if ($clean !== $details) {
                        DB::table('bantuan_events')->where('id', $event->id)->update([
                            'details' => Crypt::encryptString(json_encode($clean, JSON_THROW_ON_ERROR)),
                        ]);
                    }
                }
            });
        });
        if (Schema::hasColumn('bantuan_applications', 'reporter_id')) {
            Schema::table('bantuan_applications', fn (Blueprint $table) => $table->dropColumn('reporter_id'));
        }
        Schema::dropIfExists('bantuan_reporters');
    }

    private function withoutReporter(array $value): array
    {
        foreach ($value as $key => $item) {
            if (in_array($key, ['reporter', 'reporterId', 'reporter_id'], true)) {
                unset($value[$key]);
            } elseif (is_array($item)) {
                $value[$key] = $this->withoutReporter($item);
            }
        }
        return $value;
    }

    public function down(): void
    {
        throw new RuntimeException('Data pelapor dihapus permanen atas permintaan pengguna dan tidak dapat dipulihkan lewat rollback.');
    }
};
