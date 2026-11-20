<?php

use App\Modules\Core\Services\UserService;
use App\Modules\Rapat\Jobs\ProcessMeeting;
use App\Modules\Rapat\Models\Media;
use App\Modules\Rapat\Models\Meeting;
use App\Modules\Rapat\Providers\RapatServiceProvider;
use App\Modules\Rapat\Services\LocalEngine;
use App\Modules\Rapat\Services\NoSpeechDetected;
use App\Modules\Rapat\Services\RapatData;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);
function rapatActor(string $role)
{
    $u = app(UserService::class)->create(['name' => 'Rapat '.$role, 'password' => 'only-test-password']);
    DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'user_id' => $u->id, 'module_id' => 'module-rapat', 'role' => $role]);

    return $u;
}
function rapatAudio(string $name = 'audio.wav')
{
    $samples = str_repeat("\0", 1600);
    $wav = 'RIFF'.pack('V', 36 + strlen($samples)).'WAVEfmt '.pack('VvvVVvv', 16, 1, 1, 8000, 16000, 2, 16).'data'.pack('V', strlen($samples)).$samples;

    return UploadedFile::fake()->createWithContent($name, $wav);
}
beforeEach(function () {
    if (! app()->providerIsLoaded(RapatServiceProvider::class)) {
        app()->register(RapatServiceProvider::class);
    }
    Storage::fake('local');
    Queue::fake();
    Cache::flush();
    $this->actor = rapatActor('secretary');
    Sanctum::actingAs($this->actor);
    $this->payload = ['title' => 'Rahasia & <rapat>', 'meetingDate' => '2026-11-20', 'template' => 'dinas', 'participants' => [['name' => 'Peserta <A>', 'position' => 'Guru']], 'institution' => ['name' => 'Sekolah', 'heading' => 'Kop', 'address' => 'Alamat']];
    $this->app->instance(LocalEngine::class, new class extends LocalEngine
    {
        public function health(): array
        {
            return ['provider' => 'local', 'configured' => true];
        }

        public function run(array $i): array
        {
            return $i['operation'] === 'transcribe' ? ['text' => 'Hasil rekaman', 'segments' => [['start' => 0, 'end' => 1, 'text' => 'Hasil rekaman', 'speaker' => null]]] : ['summary' => 'Ringkasan', 'discussion' => ['Bahasan'], 'decisions' => ['Sepakat'], 'actions' => [['task' => 'Tindak lanjut', 'assignee' => null, 'dueDate' => null, 'status' => 'open']]];
        }
    });
});
it('requires authentication active module and recognized roles', function () {
    $this->app['auth']->forgetGuards();
    $this->getJson('/api/v1/rapat/viewer')->assertUnauthorized();
    Sanctum::actingAs($this->actor);
    DB::table('module_access')->where('user_id', $this->actor->id)->update(['role' => 'unknown']);
    $this->getJson('/api/v1/rapat/viewer')->assertForbidden();
    DB::table('module_access')->where('user_id', $this->actor->id)->delete();
    $this->getJson('/api/v1/rapat/viewer')->assertForbidden();
});
it('scopes secretaries allows viewer reads and encrypts private payloads', function () {
    $id = $this->postJson('/api/v1/rapat/meetings', $this->payload)->assertCreated()->assertHeader('Cache-Control', 'no-store, private')->json('data.id');
    expect(DB::table('rapat_meetings')->value('payload'))->not->toContain('Rahasia');
    Sanctum::actingAs(rapatActor('secretary'));
    $this->getJson('/api/v1/rapat/meetings/'.$id)->assertNotFound();
    $this->getJson('/api/v1/rapat/meetings')->assertJsonPath('meta.total', 0);
    Sanctum::actingAs(rapatActor('viewer'));
    $this->getJson('/api/v1/rapat/meetings/'.$id)->assertOk();
    $this->postJson('/api/v1/rapat/meetings', $this->payload)->assertForbidden();
    $this->getJson('/api/v1/rapat/settings')->assertForbidden();
    Sanctum::actingAs(rapatActor('admin'));
    $this->getJson('/api/v1/rapat/settings')->assertOk();
    $this->getJson('/api/v1/rapat/meetings/'.$id)->assertOk();
});
it('enforces versions archives and retains manual corrections', function () {
    $id = $this->postJson('/api/v1/rapat/meetings', $this->payload)->json('data.id');
    $url = '/api/v1/rapat/meetings/'.$id;
    $this->putJson($url, ['version' => 1, 'transcript' => 'Koreksi manual'])->assertOk()->assertJsonPath('data.version', 2);
    $this->putJson($url, ['version' => 1, 'title' => 'Basi'])->assertConflict();
    $this->postJson($url.'/archive', ['version' => 2, 'archived' => true])->assertOk();
    $this->putJson($url, ['version' => 3, 'transcript' => 'Ganti'])->assertConflict();
    $this->getJson('/api/v1/rapat/meetings')->assertJsonPath('meta.total', 0);
    $this->getJson('/api/v1/rapat/meetings?archived=1&q=Koreksi')->assertJsonPath('meta.total', 1);
    $this->postJson($url.'/archive', ['version' => 3, 'archived' => false])->assertOk()->assertJsonPath('data.transcript', 'Koreksi manual');
});
it('validates real mime idempotency stable sequence and private playback', function () {
    $id = $this->postJson('/api/v1/rapat/meetings', $this->payload)->json('data.id');
    $url = '/api/v1/rapat/meetings/'.$id.'/media';
    $key = (string) Str::uuid();
    $this->post($url, ['file' => UploadedFile::fake()->createWithContent('evil.wav', '<?php echo 1;'), 'clientId' => $key, 'sequence' => 1], ['Accept' => 'application/json'])->assertUnprocessable();
    $mid = $this->post($url, ['file' => rapatAudio(), 'clientId' => $key, 'sequence' => 1], ['Accept' => 'application/json'])->assertCreated()->json('data.id');
    $this->post($url, ['file' => rapatAudio(), 'clientId' => $key, 'sequence' => 1], ['Accept' => 'application/json'])->assertCreated()->assertJsonPath('data.id', $mid);
    $this->post($url, ['file' => rapatAudio(), 'clientId' => $key, 'sequence' => 2], ['Accept' => 'application/json'])->assertConflict();
    expect(Media::count())->toBe(1);
    $media = Media::first();
    expect(Storage::disk('local')->get($media->path))->not->toContain('RIFF');
    $this->get('/api/v1/rapat/media/'.$mid)->assertOk()->assertHeader('Cache-Control', 'no-store, private');
    Sanctum::actingAs(rapatActor('secretary'));
    $this->getJson('/api/v1/rapat/media/'.$mid)->assertNotFound();
    Sanctum::actingAs($this->actor);
    $this->deleteJson('/api/v1/rapat/media/'.$mid, ['version' => 1])->assertConflict();
    $this->deleteJson('/api/v1/rapat/media/'.$mid, ['version' => 2])->assertNoContent();
    $this->getJson('/api/v1/rapat/media/'.$mid)->assertNotFound();
});
it('queues durable generation and ignores duplicate stale jobs', function () {
    $id = $this->postJson('/api/v1/rapat/meetings', $this->payload)->json('data.id');
    $url = '/api/v1/rapat/meetings/'.$id;
    $this->putJson($url, ['version' => 1, 'transcript' => 'Teks manual'])->assertOk();
    $this->postJson($url.'/generate', ['version' => 2, 'useTranscript' => true])->assertStatus(202)->assertJsonPath('data.status', 'processing');
    Queue::assertPushed(ProcessMeeting::class, fn ($j) => $j->connection === 'rapat' && $j->queue === 'rapat' && $j->tries === 1 && $j->timeout === 3600);
    $m = Meeting::find($id);
    $job = new ProcessMeeting($id, $m->run_token, true);
    $job->handle(app(LocalEngine::class));
    $this->getJson($url)->assertJsonPath('data.status', 'ready')->assertJsonPath('data.transcript', 'Teks manual')->assertJsonPath('data.minutes.summary', 'Ringkasan');
    $version = Meeting::find($id)->version;
    $job->handle(app(LocalEngine::class));
    expect(Meeting::find($id)->version)->toBe($version);
});
it('persists partial transcripts hides errors and retries only unfinished files', function () {
    $id = $this->postJson('/api/v1/rapat/meetings', $this->payload)->json('data.id');
    $url = '/api/v1/rapat/meetings/'.$id;
    foreach ([1, 2] as $seq) {
        $this->post($url.'/media', ['file' => rapatAudio(), 'clientId' => (string) Str::uuid(), 'sequence' => $seq], ['Accept' => 'application/json'])->assertCreated();
    }
    $engine = new class extends LocalEngine
    {
        public int $calls = 0;

        public bool $fail = true;

        public function run(array $i): array
        {
            if ($i['operation'] === 'transcribe') {
                $this->calls++;
                if ($this->fail && $this->calls === 2) {
                    throw new RuntimeException('PRIVATE path secret');
                }

                return ['text' => 'Audio', 'segments' => [['start' => 0, 'end' => 1, 'text' => 'Audio', 'speaker' => null]]];
            }

            return ['summary' => 'OK', 'discussion' => [], 'decisions' => [], 'actions' => []];
        }
    };
    $this->postJson($url.'/generate', ['version' => 3, 'useTranscript' => false])->assertStatus(202);
    $m = Meeting::find($id);
    $old = new ProcessMeeting($id, $m->run_token, false);
    $old->handle($engine);
    $m = Meeting::find($id);
    expect($m->status)->toBe('failed');
    expect($m->payload['error'])->not->toContain('secret');
    expect(Media::where('transcribed', true)->count())->toBe(1);
    expect($m->payload['transcript'])->toBe('Audio');
    $engine->fail = false;
    $this->postJson($url.'/generate', ['version' => $m->version, 'useTranscript' => false])->assertStatus(202);
    $m = Meeting::find($id);
    $old->failed(new RuntimeException);
    expect(Meeting::find($id)->status)->toBe('processing');
    (new ProcessMeeting($id, $m->run_token, false))->handle($engine);
    expect($engine->calls)->toBe(3);
    expect(Meeting::find($id)->status)->toBe('ready');
});
it('exports genuine escaped OOXML with attendance and no private paths', function () {
    $id = $this->postJson('/api/v1/rapat/meetings', $this->payload)->json('data.id');
    $r = $this->get('/api/v1/rapat/meetings/'.$id.'/docx')->assertOk()->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    $tmp = tempnam(sys_get_temp_dir(), 'docx_test');
    try {
        file_put_contents($tmp, $r->getContent());
        $zip = new ZipArchive;
        expect($zip->open($tmp))->toBeTrue();
        $xml = $zip->getFromName('word/document.xml');
        $zip->close();
        expect($xml)->toContain('&amp; &lt;rapat&gt;', 'DAFTAR HADIR', 'Peserta &lt;A&gt;', 'Tanda tangan');
        expect($xml)->not->toContain('storage/');
        expect($xml)->toContain('Status: DRAF', 'Hadir', 'Belum dicatat', 'Tidak ada keputusan dicatat.', 'Tidak ada tindak lanjut dicatat.');
    } finally {
        unlink($tmp);
    }
});

it('accepts empty defaults validates lengths and protects running meetings', function () {
    $payload = [...$this->payload, 'participants' => [], 'institution' => ['name' => '', 'heading' => '', 'address' => '']];
    $id = $this->postJson('/api/v1/rapat/meetings', $payload)->assertCreated()->assertJsonPath('data.institution.name', '')->json('data.id');
    $url = '/api/v1/rapat/meetings/'.$id;
    $this->putJson($url, ['version' => 1, 'transcript' => str_repeat('a', 200001)])->assertUnprocessable();
    $this->putJson($url, ['version' => 1, 'transcript' => 'Manual', 'minutes' => ['summary' => '', 'discussion' => [], 'decisions' => [], 'actions' => []]])->assertOk()->assertJsonPath('data.minutes.summary', '');
    $this->postJson($url.'/generate', ['version' => 2, 'useTranscript' => false])->assertUnprocessable();
    $this->postJson($url.'/generate', ['version' => 2, 'useTranscript' => true])->assertStatus(202);
    $this->putJson($url, ['version' => 3, 'title' => 'Running'])->assertConflict();
    $this->postJson($url.'/archive', ['version' => 3, 'archived' => true])->assertConflict();
    $this->post($url.'/media', ['file' => rapatAudio(), 'clientId' => (string) Str::uuid(), 'sequence' => 1], ['Accept' => 'application/json'])->assertConflict();
});
it('restricts settings and persists encrypted administrator defaults', function () {
    $this->putJson('/api/v1/rapat/settings', ['institution' => $this->payload['institution'], 'participants' => []])->assertForbidden();
    Sanctum::actingAs(rapatActor('admin'));
    $this->putJson('/api/v1/rapat/settings', ['institution' => $this->payload['institution'], 'participants' => []])->assertOk();
    expect(DB::table('rapat_settings')->value('payload'))->not->toContain('Sekolah');
    $this->getJson('/api/v1/rapat/settings')->assertOk()->assertJsonPath('data.institution.name', 'Sekolah');
    $this->getJson('/api/v1/rapat/viewer')->assertOk()->assertJsonPath('data.ai.provider', 'local')->assertJsonPath('data.institution.name', 'Sekolah');
});
it('caches bounded local health and refuses unavailable engines without queueing', function () {
    $engine = new class extends LocalEngine
    {
        public int $calls = 0;

        public function run(array $input): array
        {
            $this->calls++;
            throw new RuntimeException('sensitive model error');
        }
    };
    expect($engine->health())->toBe(['provider' => 'local', 'configured' => false]);
    $engine->health();
    expect($engine->calls)->toBe(1);
    $this->app->instance(LocalEngine::class, $engine);
    $id = $this->postJson('/api/v1/rapat/meetings', $this->payload)->json('data.id');
    $this->postJson('/api/v1/rapat/meetings/'.$id.'/generate', ['version' => 1, 'useTranscript' => true])->assertStatus(503);
    Queue::assertNothingPushed();
    expect(Meeting::find($id)->status)->toBe('draft');
});

it('passes the real CLI command and explicit model environment through Symfony Process', function () {
    $script = tempnam(sys_get_temp_dir(), 'rapat_protocol_');
    try {
        file_put_contents($script, '<?php $input=json_decode(stream_get_contents(STDIN),true); echo json_encode(["command"=>$argv[1]??null,"operation"=>$input["operation"]??null,"model"=>getenv("RAPAT_WHISPER_MODEL"),"ollama"=>getenv("RAPAT_OLLAMA_MODEL"),"url"=>getenv("RAPAT_OLLAMA_URL"),"roots"=>getenv("RAPAT_AUDIO_ROOTS")]);');
        config(['rapat.python' => PHP_BINARY, 'rapat.engine' => $script, 'rapat.model_dirs' => ['RAPAT_WHISPER_MODEL' => 'base', 'RAPAT_OLLAMA_MODEL' => 'qwen2.5:1.5b', 'RAPAT_OLLAMA_URL' => 'http://127.0.0.1:11434']]);
        $result = (new LocalEngine)->run(['operation' => 'health']);
        expect($result['command'])->toBe('health');
        expect($result['model'])->toBe('base');
        expect($result['ollama'])->toBe('qwen2.5:1.5b');
        expect($result['url'])->toBe('http://127.0.0.1:11434');
        expect($result['roots'])->toBe(storage_path('app/private/rapat/tmp'));
    } finally {
        unlink($script);
    }
});
it('accepts an upper date filter alone and rejects excessive audio size and sequence', function () {
    $id = $this->postJson('/api/v1/rapat/meetings', $this->payload)->json('data.id');
    $this->getJson('/api/v1/rapat/meetings?to=2026-11-20')->assertOk()->assertJsonPath('meta.total', 1);
    $this->post('/api/v1/rapat/meetings/'.$id.'/media', ['file' => rapatAudio(), 'clientId' => (string) Str::uuid(), 'sequence' => 501], ['Accept' => 'application/json'])->assertUnprocessable();
    $this->post('/api/v1/rapat/meetings/'.$id.'/media', ['file' => UploadedFile::fake()->create('huge.wav', 20481), 'clientId' => (string) Str::uuid(), 'sequence' => 1], ['Accept' => 'application/json'])->assertUnprocessable();
});

function rapatRunAudio($test, string $id, LocalEngine $engine): void
{
    $m = Meeting::findOrFail($id);
    $test->postJson('/api/v1/rapat/meetings/'.$id.'/generate', ['version' => $m->version, 'useTranscript' => false])->assertStatus(202);
    $m->refresh();
    (new ProcessMeeting($id, $m->run_token, false))->handle($engine);
}
function rapatCountingEngine(): LocalEngine
{
    return new class extends LocalEngine
    {
        public int $transcriptions = 0;

        public int $summaries = 0;

        public bool $failSummary = false;

        public function run(array $input): array
        {
            if ($input['operation'] === 'transcribe') {
                $this->transcriptions++;

                return ['text' => 'Rekaman baru '.$this->transcriptions, 'segments' => [['start' => 0, 'end' => 1, 'text' => 'Rekaman baru '.$this->transcriptions, 'speaker' => null]]];
            }
            $this->summaries++;
            if ($this->failSummary) {
                throw new RuntimeException('private raw exception');
            }

            return ['summary' => 'Notulen baru', 'discussion' => [], 'decisions' => [], 'actions' => []];
        }
    };
}
it('invalidates legacy cached transcripts and cache from different model or pipeline revisions', function () {
    config(['rapat.model_dirs.RAPAT_WHISPER_MODEL' => 'base', 'rapat.transcription_pipeline_version' => 'test-v1']);
    $id = $this->postJson('/api/v1/rapat/meetings', $this->payload)->json('data.id');
    $this->post('/api/v1/rapat/meetings/'.$id.'/media', ['file' => rapatAudio(), 'clientId' => (string) Str::uuid(), 'sequence' => 1], ['Accept' => 'application/json'])->assertCreated();
    $media = Media::where('meeting_id', $id)->first();
    $mp = $media->payload;
    $mp['result'] = ['text' => 'Legacy garbage', 'segments' => []];
    $media->payload = $mp;
    $media->transcribed = true;
    $media->save();
    $engine = rapatCountingEngine();
    $engine->failSummary = true;
    $revision = $engine->transcriptionRevision();
    expect($engine->transcriptionRevision())->toBe($revision);
    rapatRunAudio($this, $id, $engine);
    expect($engine->transcriptions)->toBe(1);
    expect($media->refresh()->payload['transcriptionRevision'])->toBe($revision);
    expect(Meeting::find($id)->payload['transcript'])->toBe('Rekaman baru 1');
    // Same failed run revision: retain the completed audio and retry only minutes.
    rapatRunAudio($this, $id, $engine);
    expect($engine->transcriptions)->toBe(1);
    config(['rapat.model_dirs.RAPAT_WHISPER_MODEL' => 'large-v3-turbo']);
    $modelRevision = $engine->transcriptionRevision();
    expect($modelRevision)->not->toBe($revision);
    // Config changes alone must not rewrite stored records.
    expect($media->refresh()->payload['transcriptionRevision'])->toBe($revision);
    rapatRunAudio($this, $id, $engine);
    expect($engine->transcriptions)->toBe(2);
    expect($media->refresh()->payload['transcriptionRevision'])->toBe($modelRevision);
    config(['rapat.transcription_pipeline_version' => 'test-v2']);
    expect($engine->transcriptionRevision())->not->toBe($modelRevision);
    rapatRunAudio($this, $id, $engine);
    expect($engine->transcriptions)->toBe(3);
    expect($media->refresh()->payload['transcriptionRevision'])->toBe($engine->transcriptionRevision());
});
it('forces fresh audio on ready regeneration but retains manual minutes until success', function () {
    $id = $this->postJson('/api/v1/rapat/meetings', $this->payload)->json('data.id');
    $url = '/api/v1/rapat/meetings/'.$id;
    $this->post($url.'/media', ['file' => rapatAudio(), 'clientId' => (string) Str::uuid(), 'sequence' => 1], ['Accept' => 'application/json'])->assertCreated();
    $engine = rapatCountingEngine();
    rapatRunAudio($this, $id, $engine);
    $m = Meeting::find($id);
    expect($m->status)->toBe('ready');
    $this->putJson($url, ['version' => $m->version, 'minutes' => ['summary' => 'Notulen manual dipertahankan', 'discussion' => [], 'decisions' => [], 'actions' => []]])->assertOk();
    $m->refresh();
    $media = Media::where('meeting_id', $id)->first();
    $oldRevision = $media->payload['transcriptionRevision'];
    // A rejected stale request cannot invalidate caches.
    $this->postJson($url.'/generate', ['version' => 1, 'useTranscript' => false])->assertConflict();
    expect($media->refresh()->transcribed)->toBeTrue();
    $this->postJson($url.'/generate', ['version' => $m->version, 'useTranscript' => false])->assertStatus(202)->assertJsonPath('data.minutes.summary', 'Notulen manual dipertahankan');
    expect($media->refresh()->transcribed)->toBeFalse();
    expect($media->payload['transcriptionRevision'])->toBe($oldRevision);
    $m->refresh();
    $engine->failSummary = true;
    (new ProcessMeeting($id, $m->run_token, false))->handle($engine);
    expect($engine->transcriptions)->toBe(2);
    $this->getJson($url)->assertJsonPath('data.status', 'failed')->assertJsonPath('data.minutes.summary', 'Notulen manual dipertahankan');
    $engine->failSummary = false;
    rapatRunAudio($this, $id, $engine);
    expect($engine->transcriptions)->toBe(2);
    $this->getJson($url)->assertJsonPath('data.status', 'ready')->assertJsonPath('data.minutes.summary', 'Notulen baru');
});
it('leaves manual transcript generation and cached media untouched after model changes', function () {
    $id = $this->postJson('/api/v1/rapat/meetings', $this->payload)->json('data.id');
    $url = '/api/v1/rapat/meetings/'.$id;
    $this->post($url.'/media', ['file' => rapatAudio(), 'clientId' => (string) Str::uuid(), 'sequence' => 1], ['Accept' => 'application/json'])->assertCreated();
    $engine = rapatCountingEngine();
    rapatRunAudio($this, $id, $engine);
    $m = Meeting::find($id);
    $this->putJson($url, ['version' => $m->version, 'transcript' => 'Koreksi pengguna'])->assertOk();
    $media = Media::where('meeting_id', $id)->first();
    $raw = $media->getRawOriginal('payload');
    config(['rapat.model_dirs.RAPAT_WHISPER_MODEL' => 'different-model', 'rapat.transcription_pipeline_version' => 'next']);
    $m->refresh();
    $this->postJson($url.'/generate', ['version' => $m->version, 'useTranscript' => true])->assertStatus(202);
    expect($media->refresh()->transcribed)->toBeTrue();
    $m->refresh();
    (new ProcessMeeting($id, $m->run_token, true))->handle($engine);
    expect($engine->transcriptions)->toBe(1);
    expect($media->refresh()->getRawOriginal('payload'))->toBe($raw);
    $this->getJson($url)->assertJsonPath('data.transcript', 'Koreksi pengguna')->assertJsonPath('data.status', 'ready');
});
it('reports no speech without generating minutes or inventing transcript content', function () {
    $id = $this->postJson('/api/v1/rapat/meetings', $this->payload)->json('data.id');
    $this->post('/api/v1/rapat/meetings/'.$id.'/media', ['file' => rapatAudio(), 'clientId' => (string) Str::uuid(), 'sequence' => 1], ['Accept' => 'application/json'])->assertCreated();
    $engine = new class extends LocalEngine
    {
        public int $summaries = 0;

        public function run(array $input): array
        {
            if ($input['operation'] === 'transcribe') {
                return ['text' => '  ', 'segments' => []];
            }
            $this->summaries++;
            throw new RuntimeException('Must not summarize silence');
        }
    };
    rapatRunAudio($this, $id, $engine);
    $this->getJson('/api/v1/rapat/meetings/'.$id)->assertJsonPath('data.status', 'failed')->assertJsonPath('data.error', NoSpeechDetected::MESSAGE)->assertJsonPath('data.minutes.summary', '');
    expect(trim(Meeting::find($id)->payload['transcript']))->toBe('');
    expect($engine->summaries)->toBe(0);
});
it('maps the actual no_usable_speech runtime error to a safe failed meeting', function () {
    $script = tempnam(sys_get_temp_dir(), 'rapat_silence_');
    try {
        file_put_contents($script, '<?php echo json_encode(["error"=>["code"=>"no_usable_speech","message"=>"PRIVATE transcript /path"]]);exit(1);');
        config(['rapat.python' => PHP_BINARY, 'rapat.engine' => $script]);
        expect(fn () => (new LocalEngine)->run(['operation' => 'transcribe']))->toThrow(NoSpeechDetected::class, NoSpeechDetected::MESSAGE);
        $id = $this->postJson('/api/v1/rapat/meetings', $this->payload)->assertCreated()->json('data.id');
        $this->post('/api/v1/rapat/meetings/'.$id.'/media', ['file' => rapatAudio(), 'clientId' => (string) Str::uuid(), 'sequence' => 1], ['Accept' => 'application/json'])->assertCreated();
        rapatRunAudio($this, $id, new LocalEngine);
        $this->getJson('/api/v1/rapat/meetings/'.$id)
            ->assertJsonPath('data.status', 'failed')
            ->assertJsonPath('data.error', NoSpeechDetected::MESSAGE)
            ->assertJsonPath('data.transcript', '')
            ->assertJsonPath('data.minutes.summary', '');
        expect(Media::where('meeting_id', $id)->first()->transcribed)->toBeFalse();

    } finally {
        unlink($script);
    }
});

it('saves complete manual minutes on create and finalizes without any engine health probe', function () {
    $engine = new class extends LocalEngine
    {
        public function health(): array
        {
            throw new RuntimeException('Manual flow must not probe AI');
        }

        public function run(array $input): array
        {
            throw new RuntimeException('Manual flow must not run AI');
        }
    };
    $this->app->instance(LocalEngine::class, $engine);
    $this->getJson('/api/v1/rapat/viewer')->assertOk()->assertJsonPath('data.ai.configured', false);
    $minutes = ['summary' => 'Ringkasan manual hasil pembahasan nyata.', 'discussion' => ['Dibahas jadwal operasional.'], 'decisions' => ['Jadwal disetujui.'], 'actions' => [['task' => 'Susun jadwal', 'assignee' => 'Sari', 'dueDate' => null, 'status' => 'open']]];
    $id = $this->postJson('/api/v1/rapat/meetings', [...$this->payload, 'minutes' => $minutes])->assertCreated()->assertJsonPath('data.minutes', $minutes)->assertJsonPath('data.workflowStatus', 'draft')->assertJsonPath('data.participants.0.attendance', 'present')->json('data.id');
    $url = '/api/v1/rapat/meetings/'.$id;
    $this->postJson($url.'/finalize', ['version' => 1, 'finalized' => true])->assertOk()->assertJsonPath('data.workflowStatus', 'finalized')->assertJsonPath('data.minutes', $minutes);
    $this->getJson($url.'/history')->assertOk()->assertHeader('Cache-Control', 'no-store, private')->assertJsonPath('meta.total', 2)->assertJsonPath('data.0.action', 'finalize')->assertJsonPath('data.1.action', 'create')->assertJsonPath('data.1.before', null)->assertJsonPath('data.1.after.minutes', $minutes)->assertJsonPath('data.0.actor.id', $this->actor->id);
    expect(DB::table('rapat_revisions')->value('payload'))->not->toContain('Ringkasan', 'Sari');
    $this->get('/api/v1/rapat/meetings/'.$id.'/docx')->assertOk();
});
it('locks finalized content rejects missing PIC and requires a real reopen reason', function () {
    $id = $this->postJson('/api/v1/rapat/meetings', $this->payload)->json('data.id');
    $url = '/api/v1/rapat/meetings/'.$id;
    $this->postJson($url.'/finalize', ['version' => 1, 'finalized' => true])->assertUnprocessable();
    $minutes = ['summary' => 'Pembahasan laporan bulanan sudah ditinjau.', 'discussion' => [], 'decisions' => [], 'actions' => [['task' => 'Tinjau arsip', 'assignee' => ' ', 'dueDate' => null, 'status' => 'open']]];
    $this->putJson($url, ['version' => 1, 'minutes' => $minutes])->assertOk();
    $this->postJson($url.'/finalize', ['version' => 2, 'finalized' => true])->assertUnprocessable()->assertJsonValidationErrors(['minutes.actions.0.assignee'], 'error.details');
    $minutes['actions'][0]['assignee'] = 'Sari';
    $this->putJson($url, ['version' => 2, 'minutes' => $minutes])->assertOk();
    $this->postJson($url.'/finalize', ['version' => 3, 'finalized' => true])->assertOk()->assertJsonPath('data.version', 4);
    $this->putJson($url, ['version' => 4, 'title' => 'Forbidden'])->assertConflict();
    $this->post($url.'/media', ['file' => rapatAudio(), 'clientId' => (string) Str::uuid(), 'sequence' => 1], ['Accept' => 'application/json'])->assertConflict();
    $this->postJson($url.'/generate', ['version' => 4, 'useTranscript' => true])->assertConflict();
    $this->postJson($url.'/finalize', ['version' => 4, 'finalized' => false, 'reason' => 'short'])->assertUnprocessable();
    $this->postJson($url.'/finalize', ['version' => 3, 'finalized' => false, 'reason' => 'Alasan koreksi catatan'])->assertConflict();
    $this->postJson($url.'/finalize', ['version' => 4, 'finalized' => false, 'reason' => 'Alasan koreksi catatan'])->assertOk()->assertJsonPath('data.workflowStatus', 'draft')->assertJsonPath('data.finalizedAt', null);
    $this->getJson($url.'/history')->assertJsonPath('data.0.action', 'reopen')->assertJsonPath('data.0.reason', 'Alasan koreksi catatan');
});
it('preserves timestamp segments when an unchanged transcript accompanies manual edits', function () {
    $id = $this->postJson('/api/v1/rapat/meetings', $this->payload)->json('data.id');
    $m = Meeting::find($id);
    $p = $m->payload;
    $p['transcript'] = 'Transkrip asli';
    $segments = [['start' => 1, 'end' => 3, 'text' => 'Transkrip asli', 'speaker' => null]];
    $p['segments'] = $segments;
    $m->payload = $p;
    $m->save();
    $this->putJson('/api/v1/rapat/meetings/'.$id, ['version' => 1, 'title' => 'Judul diperbaiki', 'transcript' => 'Transkrip asli'])->assertOk()->assertJsonPath('data.segments', $segments);
    $this->putJson('/api/v1/rapat/meetings/'.$id, ['version' => 2, 'transcript' => 'Transkrip dikoreksi'])->assertOk()->assertJsonPath('data.segments', []);
});
it('keeps archived finalized tasks visible and editable with optimistic status history', function () {
    $this->travelTo(Carbon::parse('2026-11-21 00:15:00', 'Asia/Jakarta'));
    $minutes = ['summary' => 'Rapat memutuskan jadwal pelaksanaan.', 'discussion' => [], 'decisions' => [], 'actions' => [
        ['task' => 'Tugas terlambat', 'assignee' => 'Sari', 'dueDate' => '2026-11-20', 'status' => 'open'],
        ['task' => 'Tugas hari ini', 'assignee' => 'Dedi', 'dueDate' => '2026-11-21', 'status' => 'open'],
        ['task' => 'Tugas selesai', 'assignee' => 'Sari', 'dueDate' => '2026-11-19', 'status' => 'done']]];
    $id = $this->postJson('/api/v1/rapat/meetings', [...$this->payload, 'minutes' => $minutes])->json('data.id');
    $url = '/api/v1/rapat/meetings/'.$id;
    $this->postJson($url.'/finalize', ['version' => 1, 'finalized' => true])->assertOk();
    $this->postJson($url.'/archive', ['version' => 2, 'archived' => true])->assertOk();
    $this->getJson('/api/v1/rapat/tasks')->assertOk()->assertJsonPath('meta.total', 3)->assertJsonPath('data.0.canEdit', true);
    $this->getJson('/api/v1/rapat/tasks?status=overdue')->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.task', 'Tugas terlambat');
    $this->getJson('/api/v1/rapat/tasks?archived=0')->assertJsonPath('meta.total', 0);
    $this->getJson('/api/v1/rapat/tasks?assignee=Sari&status=done')->assertJsonPath('meta.total', 1);
    $this->getJson('/api/v1/rapat/tasks?from=2026-11-21&to=2026-11-21')->assertJsonPath('meta.total', 1);
    $this->putJson($url.'/actions/0', ['version' => 3, 'status' => 'done'])->assertOk()->assertJsonPath('data.workflowStatus', 'finalized')->assertJsonPath('data.minutes.actions.0.status', 'done');
    $this->putJson($url.'/actions/1', ['version' => 3, 'status' => 'done'])->assertConflict();
    $this->getJson($url.'/history')->assertJsonPath('data.0.action', 'task_status')->assertJsonPath('data.0.changedFields.0', 'minutes.actions.0.status');
    $this->getJson('/api/v1/rapat/tasks?status=overdue')->assertJsonPath('meta.total', 0);
    $this->getJson('/api/v1/rapat/meetings?archived=1&perPage=1')->assertJsonPath('meta.stats.finalized', 1)->assertJsonPath('meta.stats.openActions', 1)->assertJsonPath('meta.stats.overdueActions', 0);
    $this->travelBack();
});
it('scopes history and tasks and prohibits viewer or processing mutations', function () {
    $minutes = ['summary' => 'Pembahasan tindak lanjut arsip.', 'discussion' => [], 'decisions' => [], 'actions' => [['task' => 'Tugas privat', 'assignee' => 'Sari', 'dueDate' => null, 'status' => 'open']]];
    $id = $this->postJson('/api/v1/rapat/meetings', [...$this->payload, 'minutes' => $minutes])->json('data.id');
    $url = '/api/v1/rapat/meetings/'.$id;
    Sanctum::actingAs(rapatActor('secretary'));
    $this->getJson($url.'/history')->assertNotFound();
    $this->getJson('/api/v1/rapat/tasks')->assertJsonPath('meta.total', 0);
    Sanctum::actingAs(rapatActor('viewer'));
    $this->getJson('/api/v1/rapat/tasks')->assertJsonPath('data.0.canEdit', false);
    $this->putJson($url.'/actions/0', ['version' => 1, 'status' => 'done'])->assertForbidden();
    $this->postJson($url.'/finalize', ['version' => 1, 'finalized' => true])->assertForbidden();
    Sanctum::actingAs($this->actor);
    $m = Meeting::find($id);
    $m->status = 'processing';
    $m->save();
    $this->putJson($url.'/actions/0', ['version' => 1, 'status' => 'done'])->assertConflict();
});
it('keeps legacy workflow and attendance defaults without fabricating history', function () {
    $m = Meeting::create(['id' => (string) Str::uuid(), 'created_by' => $this->actor->id, 'meeting_date' => '2026-11-20', 'payload' => [...$this->payload, 'transcript' => '', 'segments' => [], 'minutes' => RapatData::minutes(), 'error' => null], 'version' => 1, 'status' => 'draft']);
    $url = '/api/v1/rapat/meetings/'.$m->id;
    $this->getJson($url)->assertOk()->assertJsonPath('data.workflowStatus', 'draft')->assertJsonPath('data.finalizedAt', null)->assertJsonPath('data.participants.0.attendance', 'present')->assertJsonPath('data.historyAvailable', true);
    $this->getJson($url.'/history')->assertJsonPath('meta.total', 0);
    expect(array_key_exists('workflowStatus', $m->refresh()->payload))->toBeFalse();
});
it('records generated minutes with an honest system actor instead of claiming the creator', function () {
    $id = $this->postJson('/api/v1/rapat/meetings', [...$this->payload, 'transcript' => 'Transkrip pembahasan'])->json('data.id');
    $url = '/api/v1/rapat/meetings/'.$id;
    $this->postJson($url.'/generate', ['version' => 1, 'useTranscript' => true])->assertStatus(202);
    $m = Meeting::find($id);
    (new ProcessMeeting($id, $m->run_token, true))->handle(app(LocalEngine::class));
    $this->getJson($url.'/history')->assertJsonPath('data.0.action', 'ai_generate')->assertJsonPath('data.0.actor.id', null)->assertJsonPath('data.0.actor.name', 'AI lokal')->assertJsonPath('data.0.after.minutes.summary', 'Ringkasan');
});
it('paginates immutable snapshots and keeps aggregate stats outside the visible page', function () {
    $minutes = ['summary' => 'Isi pembahasan catatan manual.', 'discussion' => [], 'decisions' => [], 'actions' => []];
    $id = $this->postJson('/api/v1/rapat/meetings', [...$this->payload, 'minutes' => $minutes])->json('data.id');
    $url = '/api/v1/rapat/meetings/'.$id;
    for ($i = 1; $i <= 21; $i++) {
        $this->putJson($url, ['version' => $i, 'title' => 'Koreksi '.$i])->assertOk();
    }
    $this->getJson($url.'/history')->assertJsonCount(20, 'data')->assertJsonPath('meta.total', 22)->assertJsonPath('meta.lastPage', 2);
    $this->getJson($url.'/history?page=2')->assertJsonCount(2, 'data')->assertJsonPath('data.1.action', 'create')->assertJsonPath('data.1.after.metadata.title', $this->payload['title']);
    $this->postJson('/api/v1/rapat/meetings', [...$this->payload, 'minutes' => $minutes])->assertCreated();
    $this->getJson('/api/v1/rapat/meetings?perPage=1')->assertJsonCount(1, 'data')->assertJsonPath('meta.stats.total', 2)->assertJsonPath('meta.stats.draft', 2);
});
it('probes local AI only through the explicitly requested status endpoint', function () {
    $engine = new class extends LocalEngine
    {
        public int $probes = 0;

        public function health(): array
        {
            $this->probes++;

            return ['provider' => 'local', 'configured' => true];
        }
    };
    $this->app->instance(LocalEngine::class, $engine);
    $this->getJson('/api/v1/rapat/viewer')->assertOk()->assertJsonPath('data.ai.configured', false);
    expect($engine->probes)->toBe(0);
    $this->getJson('/api/v1/rapat/ai/status')->assertOk()->assertJsonPath('data.configured', true);
    expect($engine->probes)->toBe(1);
});

it('exports finalized attendance and Jakarta dates without any AI runtime', function () {
    $this->travelTo(Carbon::parse('2026-11-20 18:30:00', 'UTC'));
    $payload = [...$this->payload, 'participants' => [['name' => 'Peserta izin', 'position' => 'Guru', 'attendance' => 'excused'], ['name' => 'Peserta absen', 'position' => 'Guru', 'attendance' => 'absent']], 'minutes' => ['summary' => 'Hasil rapat manual sudah disepakati.', 'discussion' => [], 'decisions' => [], 'actions' => []]];
    $id = $this->postJson('/api/v1/rapat/meetings', $payload)->json('data.id');
    $this->postJson('/api/v1/rapat/meetings/'.$id.'/finalize', ['version' => 1, 'finalized' => true])->assertOk();
    $r = $this->get('/api/v1/rapat/meetings/'.$id.'/docx')->assertOk();
    $tmp = tempnam(sys_get_temp_dir(), 'rapat_final_test_');
    try {
        file_put_contents($tmp, $r->getContent());
        $zip = new ZipArchive;
        expect($zip->open($tmp))->toBeTrue();
        $xml = $zip->getFromName('word/document.xml');
        $zip->close();
        expect($xml)->toContain('Status: FINAL', 'Difinalkan: 21/11/2026 01:30 WIB', 'Izin', 'Tidak hadir', 'Hasil rapat manual sudah disepakati.');
    } finally {
        unlink($tmp);
        $this->travelBack();
    }
});
