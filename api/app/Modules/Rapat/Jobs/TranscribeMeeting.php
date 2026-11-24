<?php

namespace App\Modules\Rapat\Jobs;

use App\Modules\Rapat\Models\Media;
use App\Modules\Rapat\Models\Meeting;
use App\Modules\Rapat\Services\LocalEngine;
use App\Modules\Rapat\Services\LocalEngineFailure;
use App\Modules\Rapat\Services\NoSpeechDetected;
use App\Modules\Rapat\Services\RapatData;
use App\Modules\Rapat\Services\RapatHistory;
use App\Modules\Rapat\Services\TemporaryAudio;
use App\Modules\Rapat\Services\TranscriptionRun;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use RuntimeException;

class TranscribeMeeting implements ShouldQueue
{
    use Queueable;

    public int $timeout = 1920;

    public int $tries = 3;

    public bool $failOnTimeout = false;

    public function __construct(public string $meetingId, public string $runToken)
    {
        $this->onConnection('rapat');
        $this->onQueue(TranscriptionRun::QUEUE);
        $this->afterCommit();
    }

    private function locked(): ?Meeting
    {
        $m = Meeting::whereKey($this->meetingId)->lockForUpdate()->first();

        return $m && $m->status === 'processing' && $m->run_token === $this->runToken ? $m : null;
    }

    public function handle(LocalEngine $engine, ?TemporaryAudio $temporary = null): void
    {
        $claimed = DB::transaction(function () {
            $m = $this->locked();
            if (! $m || ($m->payload['transcriptionState']['version'] ?? null) !== 1 || ($m->run_started_at && $m->run_started_at->gt(now()->subSeconds(TranscriptionRun::LEASE_SECONDS)))) {
                return false;
            }
            $m->run_started_at = now();
            $p = $m->payload;
            $p['transcriptionState']['phase'] = 'processing';
            $m->payload = $p;
            $m->save();

            return true;
        });
        if (! $claimed) {
            return;
        }
        $stage = 'prepare';
        try {
            $revision = $engine->transcriptionRevision();
            $media = Media::where('meeting_id', $this->meetingId)->orderBy('sequence')->orderBy('id')->get();
            $next = $media->first(fn ($f) => ! $f->transcribed || ($f->payload['transcriptionRevision'] ?? null) !== $revision || ! isset($f->payload['result']['durationSeconds']));
            if ($next) {
                $cached = $next->payload;
                $checkpoint = ($cached['checkpoint']['revision'] ?? null) === $revision ? $cached['checkpoint'] : ['revision' => $revision, 'nextStart' => 0, 'text' => '', 'segments' => [], 'parts' => 0];
                $start = (int) $checkpoint['nextStart'];
                $stage = 'read_audio';
                $encrypted = Storage::disk('local')->get($next->path);
                if (! is_string($encrypted) || $encrypted === '') {
                    throw new RuntimeException;
                }
                $stage = 'decrypt_audio';
                $bytes = Crypt::decryptString($encrypted);
                $stage = 'temporary_audio';
                $result = ($temporary ?? new TemporaryAudio)->withFile($bytes, function ($file) use ($engine, $start, &$stage) {
                    $stage = 'transcribe';

                    return $engine->run(['operation' => 'transcribe_part', 'file' => $file, 'language' => 'id', 'startSeconds' => $start, 'chunkSeconds' => 900]);
                });
                unset($bytes, $encrypted);
                $stage = 'validate_transcript';
                $window = Validator::make($result, ['startSeconds' => 'required|integer|in:'.$start, 'durationSeconds' => 'required|numeric|min:0|max:900', 'hasMore' => 'required|boolean'])->validate();
                $part = RapatData::transcribed($result);
                if ($window['hasMore'] && (float) $window['durationSeconds'] !== 900.0) {
                    throw new RuntimeException;
                }
                foreach ($part['segments'] as &$segment) {
                    if ($segment['end'] < $segment['start'] || $segment['end'] > $window['durationSeconds'] + 1) {
                        throw new RuntimeException;
                    }
                    $segment['start'] = min($segment['start'], $window['durationSeconds']) + $start;
                    $segment['end'] = min($segment['end'], $window['durationSeconds']) + $start;
                }
                unset($segment);
                $checkpoint['text'] = trim($checkpoint['text']."\n".$part['text']);
                $checkpoint['segments'] = array_merge($checkpoint['segments'], $part['segments']);
                $checkpoint['nextStart'] = $start + $window['durationSeconds'];
                $checkpoint['parts']++;
                $checkpoint['complete'] = ! $window['hasMore'];
                DB::transaction(function () use ($next, $checkpoint, $revision) {
                    $m = $this->locked();
                    if (! $m) {
                        return;
                    }
                    $mp = $next->payload;
                    if ($checkpoint['complete']) {
                        $mp['result'] = ['text' => $checkpoint['text'], 'segments' => $checkpoint['segments'], 'durationSeconds' => $checkpoint['nextStart'], 'parts' => $checkpoint['parts']];
                        $mp['transcriptionRevision'] = $revision;
                        unset($mp['checkpoint']);
                        $next->transcribed = true;
                    } else {
                        $mp['checkpoint'] = $checkpoint;
                        $next->transcribed = false;
                    }
                    $next->payload = $mp;
                    $next->save();
                    $this->advance($m, $revision);
                });
            } else {
                DB::transaction(function () use ($revision) {
                    if ($m = $this->locked()) {
                        $this->advance($m, $revision);
                    }
                });
            }
        } catch (\Throwable $error) {
            $this->stopOrRetry($stage, $error);
        }
    }

    private function advance(Meeting $m, string $revision): void
    {
        $text = [];
        $segments = [];
        $seconds = 0;
        $parts = 0;
        $complete = true;
        foreach (Media::where('meeting_id', $m->id)->orderBy('sequence')->orderBy('id')->get() as $media) {
            $mp = $media->payload;
            $done = $media->transcribed && ($mp['transcriptionRevision'] ?? null) === $revision && isset($mp['result']['durationSeconds']);
            $c = $done ? $mp['result'] : ((($mp['checkpoint']['revision'] ?? null) === $revision) ? $mp['checkpoint'] : null);
            if ($c) {
                if ($c['text'] !== '') {
                    $text[] = $c['text'];
                }
                foreach ($c['segments'] as $segment) {
                    $segment['start'] += $seconds;
                    $segment['end'] += $seconds;
                    $segments[] = $segment;
                }
                $seconds += $c['durationSeconds'] ?? $c['nextStart'];
                $parts += $c['parts'];
            }
            if (! $done) {
                $complete = false;
                break;
            }
        }
        $joined = implode("\n", $text);
        if (mb_strlen($joined) > 200000 || count($segments) > 20000) {
            throw new RuntimeException;
        }
        $p = $m->payload;
        $p['transcript'] = $joined;
        $p['segments'] = $segments;
        $state = $p['transcriptionState'];
        $state['parts'] = $parts;
        $state['seconds'] = $seconds;
        $state['attempts'] = 0;
        $state['recoveries'] = 0;
        $state['phase'] = $complete ? 'complete' : 'queued';
        $p['transcriptionState'] = $state;
        $p['error'] = null;
        $m->run_started_at = null;
        $m->version++;
        if ($complete && trim($joined) === '') {
            $p['transcriptionState']['phase'] = 'failed';
            $m->status = 'failed';
            $m->run_token = null;
            $p['processingMode'] = null;
            $p['error'] = NoSpeechDetected::MESSAGE;
        } elseif ($complete && ! $state['minutes']) {
            $before = RapatHistory::snapshot($m);
            $m->status = 'ready';
            $m->run_token = null;
            $p['processingMode'] = null;
            $m->payload = $p;
            $m->save();
            RapatHistory::record($m, null, 'ai_transcribe', $before, ['transcript', 'segments']);

            return;
        } else {
            $m->run_token = (string) Str::uuid();
        }
        $m->payload = $p;
        $m->save();
        if ($m->status === 'processing') {
            if ($complete) {
                ProcessMeeting::dispatch($m->id, $m->run_token, true)->afterCommit();
            } else {
                TranscriptionRun::enqueue($m);
            }
        }
    }

    private function stopOrRetry(string $stage, \Throwable $error): void
    {
        DB::transaction(function () use ($stage, $error) {
            $m = $this->locked();
            if (! $m) {
                return;
            }
            $p = $m->payload;
            $state = $p['transcriptionState'];
            $state['attempts']++;
            $retry = $stage === 'transcribe' && $error instanceof LocalEngineFailure && $state['attempts'] < 3;
            $state['phase'] = $retry ? 'retrying' : 'failed';
            $m->run_started_at = null;
            $m->version++;
            $m->run_token = $retry ? (string) Str::uuid() : null;
            $m->status = $retry ? 'processing' : 'failed';
            $p['transcriptionState'] = $state;
            $p['error'] = $retry ? null : match ($stage) {
                'read_audio', 'decrypt_audio' => 'Audio tersimpan belum dapat dibaca oleh worker. Minta admin memeriksa akses penyimpanan privat. Rekaman tetap tersimpan.',
                'temporary_audio' => 'Worker tidak dapat menyiapkan audio sementara. Rekaman dan bagian transkrip yang berhasil tetap tersimpan.',
                default => 'Bagian audio belum berhasil diproses setelah percobaan otomatis. Hasil sebelumnya tersimpan; lanjutkan setelah memeriksa worker dan model.',
            };
            if (! $retry) {
                $p['processingMode'] = null;
            }
            $m->payload = $p;
            $m->save();
            if ($retry) {
                TranscriptionRun::enqueue($m, 30 * $state['attempts']);
            }
            $diagnostic = ['meeting_id' => $m->id, 'stage' => $stage, 'reason' => $error instanceof LocalEngineFailure ? $error->reason : 'operation_failed'];
            try {
                Log::warning('rapat_part_failed', $diagnostic);
            } catch (\Throwable) {
                error_log('rapat_part_failed '.json_encode($diagnostic));
            }
        });
    }

    public function failed(?\Throwable $error): void
    {
        // Keep the checkpoint processing; scheduler recovers an abandoned claim.
        try {
            app(TranscriptionRun::class)->recover();
        } catch (\Throwable) { /* next scheduler tick */
        }
    }
}
