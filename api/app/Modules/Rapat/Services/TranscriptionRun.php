<?php

namespace App\Modules\Rapat\Services;

use App\Modules\Rapat\Jobs\TranscribeMeeting;
use App\Modules\Rapat\Models\Meeting;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TranscriptionRun
{
    public const QUEUE = 'rapat-transcription-v2';

    public const LEASE_SECONDS = 1980;

    public static function initial(bool $minutes = false): array
    {
        return ['version' => 1, 'phase' => 'queued', 'parts' => 0, 'seconds' => 0, 'attempts' => 0, 'recoveries' => 0, 'minutes' => $minutes];
    }

    public static function enqueue(Meeting $meeting, int $delay = 0): void
    {
        TranscribeMeeting::dispatch($meeting->id, $meeting->run_token)->onConnection('rapat')->onQueue(self::QUEUE)->delay($delay)->afterCommit();
    }

    // Scheduler compensation also covers a crash between DB commit and queue insert.
    public function recover(): int
    {
        $count = 0;
        foreach (Meeting::where('status', 'processing')->where('updated_at', '<=', now()->subMinutes(5))->orderBy('updated_at')->limit(100)->get() as $candidate) {
            $count += DB::transaction(function () use ($candidate) {
                $m = Meeting::whereKey($candidate->id)->lockForUpdate()->first();
                $state = $m?->payload['transcriptionState'] ?? [];
                if (! $m || $m->status !== 'processing' || ($state['version'] ?? null) !== 1 || $state['phase'] === 'complete') {
                    return 0;
                }
                if ($m->run_started_at && $m->run_started_at->gt(now()->subSeconds(self::LEASE_SECONDS))) {
                    return 0;
                }
                if (! $m->run_started_at && DB::table('rapat_jobs')->where('payload', 'like', '%'.$m->run_token.'%')->exists()) {
                    return 0;
                }
                $p = $m->payload;
                $state['recoveries'] = ($state['recoveries'] ?? 0) + 1;
                if ($state['recoveries'] > 3) {
                    $m->status = 'failed';
                    $m->run_token = null;
                    $p['processingMode'] = null;
                    $p['error'] = 'Proses terputus berulang kali. Hasil tersimpan tetap tersedia; periksa worker lalu lanjutkan transkrip.';
                    $state['phase'] = 'failed';
                } else {
                    $m->run_token = (string) Str::uuid();
                    $state['phase'] = 'retrying';
                }
                $m->run_started_at = null;
                $m->version++;
                $p['transcriptionState'] = $state;
                $m->payload = $p;
                $m->save();
                if ($m->status === 'processing') {
                    self::enqueue($m);
                }

                return 1;
            });
        }

        return $count;
    }
}
