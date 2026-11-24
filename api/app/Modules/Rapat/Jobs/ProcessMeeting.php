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
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

class ProcessMeeting implements ShouldQueue
{
    use Queueable;

    public int $timeout = 3600;

    public int $tries = 1;

    public bool $failOnTimeout = true;

    public bool $transcribeOnly = false;

    public function __construct(public string $meetingId, public string $runToken, public bool $useTranscript, bool $transcribeOnly = false)
    {
        $this->transcribeOnly = $transcribeOnly;
        $this->onConnection('rapat');
        $this->onQueue('rapat');
        $this->afterCommit();
    }

    private function current(): ?Meeting
    {
        return Meeting::whereKey($this->meetingId)->where('run_token', $this->runToken)->where('status', 'processing')->first();
    }

    private function save(callable $change, bool $audit = false): bool
    {
        return DB::transaction(function () use ($change, $audit) {
            $m = Meeting::whereKey($this->meetingId)->lockForUpdate()->first();
            if (! $m || $m->run_token !== $this->runToken || $m->status !== 'processing') {
                return false;
            }
            $before = $audit ? RapatHistory::snapshot($m) : null;
            $change($m);
            $m->version++;
            $m->save();
            if ($audit) {
                RapatHistory::record($m, null, 'ai_transcribe', $before, ['transcript', 'segments']);
            }

            return true;
        });
    }

    public function handle(LocalEngine $engine, ?TemporaryAudio $temporary = null): void
    {
        // Atomic claim, separate from the queued run token: duplicate deliveries cannot both execute.
        $claimed = DB::transaction(function () {
            $m = Meeting::whereKey($this->meetingId)->lockForUpdate()->first();
            if (! $m || $m->status !== 'processing' || $m->run_token !== $this->runToken || $m->run_started_at) {
                return false;
            }
            $m->run_started_at = now();
            $m->save();

            return true;
        });
        if (! $claimed) {
            return;
        }
        $stage = 'prepare';
        try {
            $m = $this->current();
            if (! $m) {
                return;
            }
            $p = $m->payload;
            if (! $this->useTranscript) {
                $transcriptionRevision = $engine->transcriptionRevision();
                $text = [];
                $segments = [];
                $offset = 0;
                foreach (Media::where('meeting_id', $this->meetingId)->orderBy('sequence')->orderBy('id')->get() as $media) {
                    if (! $this->current()) {
                        return;
                    }
                    $cached = $media->payload;
                    if (! $media->transcribed || ($cached['transcriptionRevision'] ?? null) !== $transcriptionRevision || ! is_array($cached['result'] ?? null)) {
                        $stage = 'read_audio';
                        $encrypted = Storage::disk('local')->get($media->path);
                        if (! is_string($encrypted) || $encrypted === '') {
                            throw new RuntimeException;
                        }
                        $stage = 'decrypt_audio';
                        $bytes = Crypt::decryptString($encrypted);
                        $stage = 'temporary_audio';
                        $result = ($temporary ?? new TemporaryAudio)->withFile($bytes, function ($temp) use ($engine, &$stage) {
                            $stage = 'transcribe';
                            $result = $engine->run(['operation' => 'transcribe', 'file' => $temp, 'language' => 'id']);
                            $stage = 'validate_transcript';

                            return RapatData::transcribed($result);
                        });
                        unset($bytes, $encrypted);
                        $stage = 'save_transcript';
                        if (! $this->save(function ($m) use ($media, $result, $transcriptionRevision) {
                            $mp = $media->payload;
                            $mp['result'] = $result;
                            $mp['transcriptionRevision'] = $transcriptionRevision;
                            $media->payload = $mp;
                            $media->transcribed = true;
                            $media->save();
                        })) {
                            return;
                        }
                    }
                    $result = $media->payload['result'];
                    $text[] = $result['text'];
                    foreach ($result['segments'] as $seg) {
                        if ($seg['end'] < $seg['start']) {
                            throw new RuntimeException;
                        }
                        $seg['start'] += $offset;
                        $seg['end'] += $offset;
                        $segments[] = $seg;
                    }
                    $offset = $segments ? max(array_column($segments, 'end')) : 0;
                    $partial = implode("\n", $text);
                    if (mb_strlen($partial) > 200000 || count($segments) > 20000) {
                        throw new RuntimeException;
                    }
                    if (! $this->save(function ($m) use ($partial, $segments) {
                        $p = $m->payload;
                        $p['transcript'] = $partial;
                        $p['segments'] = $segments;
                        $m->payload = $p;
                    })) {
                        return;
                    }
                }
            }
            $m = $this->current();
            if (! $m) {
                return;
            }
            $p = $m->payload;
            if (trim($p['transcript']) === '') {
                throw new NoSpeechDetected;
            }
            $this->save(function ($m) {
                $p = $m->payload;
                $p['error'] = null;
                $p['processingMode'] = null;
                $m->payload = $p;
                $m->status = 'ready';
                $m->run_started_at = null;
                $m->run_token = null;
            }, audit: true);
        } catch (NoSpeechDetected) {
            $this->markFailed(NoSpeechDetected::MESSAGE);
        } catch (\Throwable $error) {
            // Never log exception messages, traces, audio, transcript, or private paths.
            $diagnostic = [
                'meeting_id' => $this->meetingId,
                'stage' => $stage,
                'exception' => get_class($error),
                'reason' => $error instanceof LocalEngineFailure ? $error->reason : 'operation_failed',
            ];
            try {
                Log::warning('rapat_processing_failed', $diagnostic);
            } catch (\Throwable) {
                // A log-file permission problem must not leave the meeting processing forever.
                error_log('rapat_processing_failed '.json_encode($diagnostic));
            }
            $message = match ($stage) {
                'read_audio', 'decrypt_audio' => 'Audio tersimpan belum dapat dibaca oleh worker. Minta admin memeriksa akses penyimpanan privat. Rekaman tetap tersimpan.',
                'temporary_audio' => 'Worker tidak dapat menyiapkan audio sementara. Minta admin memeriksa izin folder sementara. Rekaman tetap tersimpan.',
                default => $error instanceof LocalEngineFailure ? match ($error->reason) {
                    'whisper_model_missing', 'whisper_model_load_failed', 'transcriber_dependency_missing' => 'Mesin transkrip belum dapat dijalankan. Minta admin memeriksa runtime dan model Whisper. Rekaman tetap tersimpan.',
                    'audio_decode_failed' => 'Format atau isi rekaman belum dapat dibaca. Coba putar audio tersimpan untuk memeriksa rekamannya.',
                    'timeout' => 'Proses transkrip melewati batas waktu server. Audio dan hasil yang sudah tersimpan tetap tersedia.',
                    default => 'Pemrosesan AI lokal gagal. Periksa model lokal lalu coba lagi.',
                } : 'Pemrosesan AI lokal gagal. Periksa model lokal lalu coba lagi.',
            };
            $this->markFailed($message);
        }
    }

    private function markFailed(string $message = 'Pemrosesan AI lokal gagal. Periksa model lokal lalu coba lagi.'): void
    {
        $this->save(function ($m) use ($message) {
            $p = $m->payload;
            $p['error'] = $message;
            $p['processingMode'] = null;
            $m->payload = $p;
            $m->status = 'failed';
            $m->run_started_at = null;
            $m->run_token = null;
        });
    }

    public function failed(?\Throwable $exception): void
    {
        $this->markFailed();
    }
}
