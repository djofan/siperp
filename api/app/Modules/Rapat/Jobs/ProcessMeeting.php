<?php

namespace App\Modules\Rapat\Jobs;

use App\Modules\Rapat\Models\Media;
use App\Modules\Rapat\Models\Meeting;
use App\Modules\Rapat\Services\LocalEngine;
use App\Modules\Rapat\Services\NoSpeechDetected;
use App\Modules\Rapat\Services\RapatData;
use App\Modules\Rapat\Services\RapatHistory;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
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
                RapatHistory::record($m, null, $this->transcribeOnly ? 'ai_transcribe' : 'ai_generate', $before, $this->transcribeOnly ? ['transcript', 'segments'] : ['transcript', 'segments', 'minutes']);
            }

            return true;
        });
    }

    public function handle(LocalEngine $engine): void
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
                        $dir = storage_path('app/private/rapat/tmp');
                        if (! is_dir($dir) && ! mkdir($dir, 0700, true) && ! is_dir($dir)) {
                            throw new RuntimeException;
                        }
                        $temp = tempnam($dir, 'audio_');
                        if ($temp === false) {
                            throw new RuntimeException;
                        }
                        try {
                            chmod($temp, 0600);
                            file_put_contents($temp, Crypt::decryptString(Storage::disk('local')->get($media->path)));
                            $result = RapatData::transcribed($engine->run(['operation' => 'transcribe', 'file' => $temp, 'language' => 'id']));
                        } finally {
                            if (is_file($temp)) {
                                unlink($temp);
                            }
                        }
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
            if ($this->transcribeOnly) {
                $this->save(function ($m) {
                    $p = $m->payload;
                    $p['error'] = null;
                    $p['processingMode'] = null;
                    $m->payload = $p;
                    $m->status = 'ready';
                    $m->run_started_at = null;
                    $m->run_token = null;
                }, audit: true);

                return;
            }
            $metadata = array_diff_key($p, array_flip(['transcript', 'segments', 'minutes', 'error']));
            $minutes = $engine->run(['operation' => 'minutes', 'transcript' => $p['transcript'], 'meeting' => $metadata]);
            $rules = array_filter(RapatData::rules(), fn ($k) => $k === 'minutes' || str_starts_with($k, 'minutes.'), ARRAY_FILTER_USE_KEY);
            $rules['minutes'][0] = 'required';
            $minutes = RapatData::normalize(Validator::make(['minutes' => $minutes], $rules)->validate())['minutes'];
            foreach ($minutes['actions'] as $action) {
                if ($action['status'] !== 'open') {
                    throw new RuntimeException;
                }
            }
            $this->save(function ($m) use ($minutes) {
                $p = $m->payload;
                $p['minutes'] = $minutes;
                $p['processingMode'] = null;
                $p['error'] = null;
                $m->payload = $p;
                $m->status = 'ready';
                $m->run_started_at = null;
                $m->run_token = null;
            }, audit: true);
        } catch (NoSpeechDetected) {
            $this->markFailed(NoSpeechDetected::MESSAGE);
        } catch (\Throwable) {
            $this->markFailed();
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
