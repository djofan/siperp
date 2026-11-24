<?php

use App\Modules\Core\Services\UserService;
use App\Modules\Rapat\Jobs\TranscribeMeeting;
use App\Modules\Rapat\Models\Media;
use App\Modules\Rapat\Models\Meeting;
use App\Modules\Rapat\Providers\RapatServiceProvider;
use App\Modules\Rapat\Services\LocalEngine;
use App\Modules\Rapat\Services\LocalEngineFailure;
use App\Modules\Rapat\Services\TranscriptionRun;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

class StagedTestEngine extends LocalEngine
{
    public int $parts = 4;

    public int $duration = 900;

    public array $calls = [];

    public array $silent = [];

    public array $failOnce = [];

    public $onRun = null;

    public function health(): array
    {
        return ['configured' => false, 'transcriberReady' => true, 'summarizerReady' => false, 'provider' => 'local'];
    }

    public function run(array $input): array
    {
        if ($input['operation'] !== 'transcribe_part') {
            throw new RuntimeException('Unexpected operation');
        }
        expect($input['chunkSeconds'])->toBe(900);
        $start = $input['startSeconds'];
        $this->calls[] = $start;
        if (is_callable($this->onRun)) {
            ($this->onRun)();
        }
        if (in_array($start, $this->failOnce, true)) {
            $this->failOnce = array_values(array_diff($this->failOnce, [$start]));
            throw new LocalEngineFailure('process_failed');
        }
        $silent = in_array($start, $this->silent, true);

        return ['text' => $silent ? '' : 'Bagian '.$start, 'segments' => $silent ? [] : [['start' => 0, 'end' => 1, 'text' => 'Bagian '.$start, 'speaker' => null]],
            'startSeconds' => $start, 'durationSeconds' => $this->duration, 'hasMore' => $start + $this->duration < $this->parts * $this->duration];
    }
}

beforeEach(function () {
    if (! app()->providerIsLoaded(RapatServiceProvider::class)) {
        app()->register(RapatServiceProvider::class);
    }
    Storage::fake('local');
    Queue::fake();
    $user = app(UserService::class)->create(['name' => 'Sekretaris uji', 'password' => 'test-only-password']);
    DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'user_id' => $user->id, 'module_id' => 'module-rapat', 'role' => 'secretary']);
    Sanctum::actingAs($user);
    $this->engine = new StagedTestEngine;
    app()->instance(LocalEngine::class, $this->engine);
    $id = $this->postJson('/api/v1/rapat/meetings', ['title' => 'Uji bertahap', 'meetingDate' => '2026-11-24', 'template' => 'dinas', 'participants' => [], 'institution' => ['name' => '', 'heading' => '', 'address' => ''], 'minutes' => ['summary' => 'Notulen manual dipertahankan', 'discussion' => [], 'decisions' => [], 'actions' => []]])->assertCreated()->json('data.id');
    $this->meetingId = $id;
    $this->url = '/api/v1/rapat/meetings/'.$id;
    $samples = str_repeat("\0", 1600);
    $wav = 'RIFF'.pack('V', 36 + strlen($samples)).'WAVEfmt '.pack('VvvVVvv', 16, 1, 1, 8000, 16000, 2, 16).'data'.pack('V', strlen($samples)).$samples;
    $this->post($this->url.'/media', ['file' => UploadedFile::fake()->createWithContent('audio.wav', $wav), 'clientId' => (string) Str::uuid(), 'sequence' => 1], ['Accept' => 'application/json'])->assertCreated();
    $this->postJson($this->url.'/transcribe', ['version' => Meeting::find($id)->version])->assertAccepted();
});

function stagedStep($test): TranscribeMeeting
{
    $m = Meeting::findOrFail($test->meetingId);
    $job = new TranscribeMeeting($m->id, $m->run_token);
    $job->handle($test->engine);

    return $job;
}

it('finishes one hour in four durable steps and produces one ordered transcript', function () {
    $first = stagedStep($this);
    $this->getJson($this->url)->assertJsonPath('data.status', 'processing')->assertJsonPath('data.transcript', 'Bagian 0')->assertJsonPath('data.transcriptionProgress.completedParts', 1)->assertDontSee('transcriptionState');
    $first->handle($this->engine); // duplicate old delivery cannot repeat completed work
    expect($this->engine->calls)->toBe([0]);
    stagedStep($this);
    stagedStep($this);
    stagedStep($this);
    $this->getJson($this->url)->assertJsonPath('data.status', 'ready')->assertJsonPath('data.transcript', "Bagian 0\nBagian 900\nBagian 1800\nBagian 2700")
        ->assertJsonPath('data.segments.3.start', 2700)->assertJsonPath('data.transcriptionProgress.processedAudioSeconds', 3600)
        ->assertJsonPath('data.minutes.summary', 'Notulen manual dipertahankan');
    expect($this->engine->calls)->toBe([0, 900, 1800, 2700]);
    Queue::assertPushed(TranscribeMeeting::class, 4);
});

it('processes three hours as twelve independent jobs without a meeting-wide timeout', function () {
    $this->engine->parts = 12;
    for ($i = 0; $i < 12; $i++) {
        $job = stagedStep($this);
        expect($job->timeout)->toBeLessThan(3600);
    }
    $this->getJson($this->url)->assertJsonPath('data.status', 'ready')->assertJsonPath('data.transcriptionProgress.completedParts', 12)->assertJsonPath('data.transcriptionProgress.processedAudioSeconds', 10800)->assertJsonPath('data.segments.11.start', 9900);
});

it('recovers an interrupted worker from the last saved checkpoint and fences stale workers', function () {
    stagedStep($this);
    stagedStep($this);
    $m = Meeting::find($this->meetingId);
    $stale = new TranscribeMeeting($m->id, $m->run_token);
    $m->run_started_at = now();
    $m->save();
    expect((new TranscriptionRun)->recover())->toBe(0);
    $this->travel(34)->minutes();
    expect((new TranscriptionRun)->recover())->toBe(1);
    $stale->handle($this->engine);
    stagedStep($this);
    stagedStep($this);
    expect($this->engine->calls)->toBe([0, 900, 1800, 2700]);
    $this->getJson($this->url)->assertJsonPath('data.status', 'ready');
});

it('automatically retries a transient failure without duplicating earlier text', function () {
    stagedStep($this);
    $this->engine->failOnce = [900];
    stagedStep($this);
    $this->getJson($this->url)->assertJsonPath('data.status', 'processing')->assertJsonPath('data.transcriptionProgress.phase', 'retrying')->assertJsonPath('data.transcript', 'Bagian 0');
    stagedStep($this);
    stagedStep($this);
    stagedStep($this);
    expect($this->engine->calls)->toBe([0, 900, 900, 1800, 2700]);
    $this->getJson($this->url)->assertJsonPath('data.status', 'ready')->assertJsonPath('data.transcriptionProgress.completedParts', 4);
});

it('keeps silent parts in the audio timeline and continues to later speech', function () {
    $this->engine->silent = [0, 1800];
    for ($i = 0; $i < 4; $i++) {
        stagedStep($this);
    }
    $this->getJson($this->url)->assertJsonPath('data.status', 'ready')->assertJsonPath('data.transcript', "Bagian 900\nBagian 2700")->assertJsonPath('data.segments.0.start', 900)->assertJsonPath('data.segments.1.start', 2700);
});

it('compensates for a lost continuation enqueue but leaves pending queues alone', function () {
    $m = Meeting::find($this->meetingId);
    $this->travel(6)->minutes();
    DB::table('rapat_jobs')->insert(['queue' => TranscriptionRun::QUEUE, 'payload' => json_encode(['token' => $m->run_token]), 'attempts' => 0, 'reserved_at' => null, 'available_at' => now()->timestamp, 'created_at' => now()->timestamp]);
    expect((new TranscriptionRun)->recover())->toBe(0);
    DB::table('rapat_jobs')->delete();
    expect((new TranscriptionRun)->recover())->toBe(1);
    stagedStep($this);
    expect($this->engine->calls)->toBe([0]);
});

it('bounds automatic retries and retains the last checkpoint for a later manual continuation', function () {
    stagedStep($this);
    for ($i = 0; $i < 3; $i++) {
        $this->engine->failOnce = [900];
        stagedStep($this);
    }
    $this->getJson($this->url)->assertJsonPath('data.status', 'failed')->assertJsonPath('data.transcript', 'Bagian 0');
    $this->postJson($this->url.'/transcribe', ['version' => Meeting::find($this->meetingId)->version])->assertAccepted();
    stagedStep($this);
    stagedStep($this);
    stagedStep($this);
    expect($this->engine->calls)->toBe([0, 900, 900, 900, 900, 1800, 2700]);
    $this->getJson($this->url)->assertJsonPath('data.status', 'ready')->assertJsonPath('data.transcriptionProgress.completedParts', 4);
});

it('marks wholly silent audio without replacing manual minutes or inventing words', function () {
    $this->engine->silent = [0, 900, 1800, 2700];
    for ($i = 0; $i < 4; $i++) {
        stagedStep($this);
    }
    $this->getJson($this->url)->assertJsonPath('data.status', 'failed')->assertJsonPath('data.transcript', '')->assertJsonPath('data.transcriptionProgress.phase', 'failed')->assertJsonPath('data.minutes.summary', 'Notulen manual dipertahankan');
});

it('starts an intentional regeneration at the beginning after a completed run', function () {
    for ($i = 0; $i < 4; $i++) {
        stagedStep($this);
    }
    $this->postJson($this->url.'/transcribe', ['version' => Meeting::find($this->meetingId)->version])->assertAccepted();
    stagedStep($this);
    expect($this->engine->calls)->toBe([0, 900, 1800, 2700, 0]);
    $this->getJson($this->url)->assertJsonPath('data.transcript', 'Bagian 0');
});

it('preserves the full timeline across browser clips including silent audio', function () {
    $this->engine->parts = 1;
    $this->engine->duration = 60;
    $this->engine->silent = [0];
    $first = Media::where('meeting_id', $this->meetingId)->first();
    $second = $first->replicate();
    $second->id = (string) Str::uuid();
    $second->client_id = (string) Str::uuid();
    $second->sequence = 2;
    $second->save();
    stagedStep($this);
    $this->engine->silent = [];
    stagedStep($this);
    $this->getJson($this->url)->assertJsonPath('data.status', 'ready')->assertJsonPath('data.segments.0.start', 60)->assertJsonPath('data.transcriptionProgress.processedAudioSeconds', 120);
});

it('runs the new staged job with real local Whisper and encrypted audio', function () {
    $sample = getenv('RAPAT_REAL_ASR_SAMPLE');
    $python = getenv('RAPAT_REAL_ASR_PYTHON');
    $models = getenv('RAPAT_REAL_ASR_MODELS');
    if (! $sample || ! $python || ! $models) {
        $this->markTestSkipped('Opt-in short real Whisper smoke test.');
    }
    config(['rapat.python' => $python, 'rapat.model_dirs' => ['RAPAT_MODEL_DIR' => $models, 'RAPAT_WHISPER_MODEL' => 'small']]);
    $file = Media::where('meeting_id', $this->meetingId)->first();
    Storage::disk('local')->put($file->path, Crypt::encryptString(file_get_contents($sample)));
    $this->engine = new LocalEngine;
    stagedStep($this);
    $m = Meeting::find($this->meetingId);
    expect($m->status)->toBe('ready');
    expect(mb_strlen($m->payload['transcript']))->toBeGreaterThan(20);
    expect($m->payload['transcriptionState']['seconds'])->toBeGreaterThan(29);
    expect($m->payload['minutes']['summary'])->toBe('Notulen manual dipertahankan');
});

it('rejects a late inference result when recovery already replaced its run token', function () {
    $this->engine->onRun = function () {
        $m = Meeting::find($this->meetingId);
        $p = $m->payload;
        $p['transcript'] = 'Hasil baru harus tetap utuh';
        $m->payload = $p;
        $m->run_token = (string) Str::uuid();
        $m->run_started_at = null;
        $m->save();
    };
    stagedStep($this);
    expect(Meeting::find($this->meetingId)->payload['transcript'])->toBe('Hasil baru harus tetap utuh');
    expect(Media::where('meeting_id', $this->meetingId)->first()->payload)->not->toHaveKey('checkpoint');
});

it('registers scheduler recovery and resumes work without any browser request', function () {
    $this->travel(6)->minutes();
    $this->artisan('rapat:resume-transcription')->expectsOutput('Recovered: 1')->assertExitCode(0);
    Queue::assertPushed(TranscribeMeeting::class, 2);
    expect(Meeting::find($this->meetingId)->payload['transcriptionState']['phase'])->toBe('retrying');
    $events = app(Schedule::class)->events();
    expect(collect($events)->contains(fn ($event) => str_contains($event->command ?? '', 'rapat:resume-transcription')))->toBeTrue();
});
