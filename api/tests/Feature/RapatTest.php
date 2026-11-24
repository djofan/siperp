<?php

use App\Modules\Core\Services\UserService;
use App\Modules\Rapat\Jobs\ProcessMeeting;
use App\Modules\Rapat\Jobs\TranscribeMeeting;
use App\Modules\Rapat\Models\Attachment;
use App\Modules\Rapat\Models\Media;
use App\Modules\Rapat\Models\Meeting;
use App\Modules\Rapat\Providers\RapatServiceProvider;
use App\Modules\Rapat\Services\LocalEngine;
use App\Modules\Rapat\Services\LocalEngineFailure;
use App\Modules\Rapat\Services\RapatData;
use App\Modules\Rapat\Services\RapatStorage;
use App\Modules\Rapat\Services\TemporaryAudio;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use League\Flysystem\UnixVisibility\PortableVisibilityConverter;

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
    $this->getJson('/api/v1/rapat/settings')->assertStatus(410);
    Sanctum::actingAs(rapatActor('admin'));
    $this->getJson('/api/v1/rapat/settings')->assertStatus(410);
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
it('writes group-readable encrypted Rapat uploads without changing other module storage', function () {
    $root = Storage::disk('local')->path('');
    Storage::disk('local')->put('other-module/private.enc', 'private-other-module');
    $other = Storage::disk('local')->path('other-module/private.enc');
    $before = fileperms($other);
    $id = $this->postJson('/api/v1/rapat/meetings', $this->payload)->json('data.id');
    $this->post('/api/v1/rapat/meetings/'.$id.'/media', ['file' => rapatAudio(), 'clientId' => (string) Str::uuid(), 'sequence' => 1], ['Accept' => 'application/json'])->assertCreated();
    $media = Media::where('meeting_id', $id)->firstOrFail();
    $disk = RapatStorage::disk();
    expect($disk->path(''))->toBe($root);
    expect($disk->getConfig()['visibility'])->toBe('private');
    expect($disk->getConfig()['serve'])->toBeFalse();
    $permissions = PortableVisibilityConverter::fromArray($disk->getConfig()['permissions']);
    expect($permissions->forFile('private'))->toBe(0640);
    expect($permissions->forDirectory('private'))->toBe(02770);
    expect($disk->get($media->path))->not->toContain('RIFF');
    if (PHP_OS_FAMILY !== 'Windows') {
        expect($disk->getVisibility($media->path))->toBe('private');
        expect(fileperms($disk->path($media->path)) & 0777)->toBe(0640);
        expect(fileperms($disk->path('rapat')) & 07777)->toBe(02770);
        expect(fileperms($disk->path('rapat/media')) & 07777)->toBe(02770);
    }
    clearstatcache(true, $other);
    expect(fileperms($other))->toBe($before);
    expect(Storage::disk('local')->get('other-module/private.enc'))->toBe('private-other-module');
    expect(fn () => RapatStorage::put('other-module/test.enc', 'encrypted'))->toThrow(RuntimeException::class);
});

it('accepts empty defaults validates lengths and protects running meetings', function () {
    $payload = [...$this->payload, 'participants' => [], 'institution' => ['name' => '', 'heading' => '', 'address' => '']];
    $id = $this->postJson('/api/v1/rapat/meetings', $payload)->assertCreated()->assertJsonPath('data.institution.name', '')->json('data.id');
    $url = '/api/v1/rapat/meetings/'.$id;
    $this->putJson($url, ['version' => 1, 'transcript' => str_repeat('a', 200001)])->assertUnprocessable();
    $this->putJson($url, ['version' => 1, 'transcript' => 'Manual'])->assertOk()->assertJsonPath('data.minutes.summary', '');
    $this->post($url.'/media', ['file' => rapatAudio(), 'clientId' => (string) Str::uuid(), 'sequence' => 1], ['Accept' => 'application/json'])->assertCreated();
    $this->postJson($url.'/transcribe', ['version' => 3])->assertAccepted();
    $this->putJson($url, ['version' => 4, 'title' => 'Running'])->assertConflict();
    $this->postJson($url.'/archive', ['version' => 4, 'archived' => true])->assertConflict();
    $this->post($url.'/media', ['file' => rapatAudio(), 'clientId' => (string) Str::uuid(), 'sequence' => 1], ['Accept' => 'application/json'])->assertConflict();
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
    expect($engine->health())->toBe(['provider' => 'local', 'configured' => false, 'transcriberReady' => false, 'summarizerReady' => false]);
    $engine->health();
    expect($engine->calls)->toBe(1);
    $this->app->instance(LocalEngine::class, $engine);
    $id = $this->postJson('/api/v1/rapat/meetings', $this->payload)->json('data.id');
    $this->postJson('/api/v1/rapat/meetings/'.$id.'/transcribe', ['version' => 1])->assertStatus(503);
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
        expect($result['roots'])->toBe(TemporaryAudio::root());
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

it('keeps legacy workflow and attendance defaults without fabricating history', function () {
    $m = Meeting::create(['id' => (string) Str::uuid(), 'created_by' => $this->actor->id, 'meeting_date' => '2026-11-20', 'payload' => [...$this->payload, 'transcript' => '', 'segments' => [], 'minutes' => RapatData::minutes(), 'error' => null], 'version' => 1, 'status' => 'draft']);
    $url = '/api/v1/rapat/meetings/'.$m->id;
    $this->getJson($url)->assertOk()->assertJsonPath('data.workflowStatus', 'draft')->assertJsonPath('data.finalizedAt', null)->assertJsonPath('data.participants.0.attendance', 'present')->assertJsonPath('data.historyAvailable', false);
    $this->getJson($url.'/history')->assertStatus(410);
    expect(DB::table('rapat_revisions')->where('meeting_id', $m->id)->count())->toBe(0);
    expect(array_key_exists('workflowStatus', $m->refresh()->payload))->toBeFalse();
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

it('transcribes with Whisper alone and preserves manual minutes and workflow', function () {
    $engine = new class extends LocalEngine
    {
        public array $calls = [];

        public function health(): array
        {
            return ['provider' => 'local', 'configured' => false, 'transcriberReady' => true, 'summarizerReady' => false];
        }

        public function run(array $input): array
        {
            $this->calls[] = $input['operation'];
            if ($input['operation'] !== 'transcribe') {
                throw new RuntimeException('Summarizer must not run');
            }

            return ['text' => 'Transkrip rapat lokal.', 'segments' => [['start' => 0, 'end' => 2, 'text' => 'Transkrip rapat lokal.', 'speaker' => null]]];
        }
    };
    $this->app->instance(LocalEngine::class, $engine);
    $manual = ['summary' => 'Catatan manual tetap tersimpan', 'discussion' => [], 'decisions' => [], 'actions' => []];
    $id = $this->postJson('/api/v1/rapat/meetings', $this->payload)->assertCreated()->json('data.id');
    $legacy = Meeting::find($id);
    $legacy->payload = [...$legacy->payload, 'minutes' => $manual];
    $legacy->save();
    $url = '/api/v1/rapat/meetings/'.$id;
    $this->post($url.'/media', ['file' => rapatAudio(), 'clientId' => (string) Str::uuid(), 'sequence' => 1], ['Accept' => 'application/json'])->assertCreated();
    $version = Meeting::find($id)->version;
    $this->postJson($url.'/transcribe', ['version' => $version])->assertAccepted()->assertJsonPath('data.processingMode', 'transcribe');
    Queue::assertPushed(TranscribeMeeting::class, fn ($job) => $job->queue === 'rapat-transcription-v2' && $job->connection === 'rapat');
    $this->postJson($url.'/transcribe', ['version' => $version])->assertConflict();
    $meeting = Meeting::find($id);
    $job = new ProcessMeeting($id, $meeting->run_token, false, true);
    $job->handle($engine);
    $this->getJson($url)->assertOk()->assertJsonPath('data.status', 'ready')->assertJsonPath('data.processingMode', null)
        ->assertJsonPath('data.transcript', 'Transkrip rapat lokal.')->assertJsonPath('data.minutes', $manual)->assertJsonPath('data.workflowStatus', 'draft');
    expect($engine->calls)->toBe(['transcribe']);
    $version = Meeting::find($id)->version;
    $job->handle($engine);
    expect(Meeting::find($id)->version)->toBe($version);
});

it('requires audio and an available transcriber before queueing transcription', function () {
    $id = $this->postJson('/api/v1/rapat/meetings', $this->payload)->json('data.id');
    $url = '/api/v1/rapat/meetings/'.$id;
    $this->postJson($url.'/transcribe', ['version' => 1])->assertUnprocessable();
    Queue::assertNothingPushed();
    $this->post($url.'/media', ['file' => rapatAudio(), 'clientId' => (string) Str::uuid(), 'sequence' => 1], ['Accept' => 'application/json'])->assertCreated();
    $this->app->instance(LocalEngine::class, new class extends LocalEngine
    {
        public function health(): array
        {
            return ['provider' => 'local', 'configured' => false, 'transcriberReady' => false, 'summarizerReady' => true];
        }
    });
    $version = Meeting::find($id)->version;
    $this->postJson($url.'/transcribe', ['version' => $version])->assertStatus(503);
    Queue::assertNothingPushed();
    expect(Meeting::find($id)->status)->toBe('draft');
});

it('does not allow readers or other secretaries to transcribe or change locked meetings', function () {
    $id = $this->postJson('/api/v1/rapat/meetings', $this->payload)->json('data.id');
    $url = '/api/v1/rapat/meetings/'.$id;
    Sanctum::actingAs(rapatActor('viewer'));
    $this->postJson($url.'/transcribe', ['version' => 1])->assertForbidden();
    Sanctum::actingAs(rapatActor('secretary'));
    $this->postJson($url.'/transcribe', ['version' => 1])->assertNotFound();
    Sanctum::actingAs($this->actor);
    $m = Meeting::find($id);
    $p = $m->payload;
    $p['workflowStatus'] = 'finalized';
    $m->payload = $p;
    $m->save();
    $this->postJson($url.'/transcribe', ['version' => 1])->assertUnprocessable();
    $p['workflowStatus'] = 'draft';
    $m->payload = $p;
    $m->archived_at = now();
    $m->save();
    $this->postJson($url.'/transcribe', ['version' => 1])->assertConflict();
    Queue::assertNothingPushed();
});

it('retains partial transcription and resumes unfinished audio without calling minutes', function () {
    $engine = new class extends LocalEngine
    {
        public int $calls = 0;

        public bool $fail = true;

        public function health(): array
        {
            return ['provider' => 'local', 'configured' => false, 'transcriberReady' => true, 'summarizerReady' => false];
        }

        public function run(array $input): array
        {
            if ($input['operation'] !== 'transcribe') {
                throw new RuntimeException;
            }
            $this->calls++;
            if ($this->fail && $this->calls === 2) {
                throw new RuntimeException('private decoder detail');
            }

            return ['text' => 'Bagian audio '.$this->calls, 'segments' => [['start' => 0, 'end' => 1, 'text' => 'Bagian audio '.$this->calls, 'speaker' => null]]];
        }
    };
    $this->app->instance(LocalEngine::class, $engine);
    $id = $this->postJson('/api/v1/rapat/meetings', $this->payload)->json('data.id');
    $url = '/api/v1/rapat/meetings/'.$id;
    foreach ([1, 2] as $sequence) {
        $this->post($url.'/media', ['file' => rapatAudio(), 'clientId' => (string) Str::uuid(), 'sequence' => $sequence], ['Accept' => 'application/json'])->assertCreated();
    }
    $this->postJson($url.'/transcribe', ['version' => Meeting::find($id)->version])->assertAccepted();
    (new ProcessMeeting($id, Meeting::find($id)->run_token, false, true))->handle($engine);
    $this->getJson($url)->assertJsonPath('data.status', 'failed')->assertJsonPath('data.transcript', 'Bagian audio 1')->assertDontSee('private decoder detail');
    expect(Media::where('meeting_id', $id)->where('transcribed', true)->count())->toBe(1);
    $engine->fail = false;
    $this->postJson($url.'/transcribe', ['version' => Meeting::find($id)->version])->assertAccepted();
    (new ProcessMeeting($id, Meeting::find($id)->run_token, false, true))->handle($engine);
    $this->getJson($url)->assertJsonPath('data.status', 'ready')->assertJsonPath('data.transcript', "Bagian audio 1\nBagian audio 3");
    expect($engine->calls)->toBe(3);
});
it('uses worker private temporary audio and removes plaintext on success and failure', function () {
    $temp = new TemporaryAudio;
    $seen = null;
    $result = $temp->withFile('private test audio', function ($path) use (&$seen) {
        $seen = $path;
        expect(dirname($path))->toBe(TemporaryAudio::root());
        expect(file_get_contents($path))->toBe('private test audio');
        if (PHP_OS_FAMILY !== 'Windows') {
            expect(fileperms($path) & 0777)->toBe(0600);
            expect(fileperms(dirname($path)) & 0777)->toBe(0700);
        }

        return 'processed';
    });
    expect($result)->toBe('processed');
    expect(is_file($seen))->toBeFalse();
    $window = null;
    expect(function () use ($temp, &$seen, &$window) {
        return $temp->withFile('private test audio', function ($path) use (&$seen, &$window) {
            $seen = $path;
            $window = $path.'_window_interrupted.wav';
            file_put_contents($window, 'private range audio');
            throw new RuntimeException('decoder failed');
        });
    })->toThrow(RuntimeException::class, 'decoder failed');
    expect($window)->toBeString();
    expect(is_file($seen))->toBeFalse();
    expect(is_file($window))->toBeFalse();
});

it('identifies temporary audio permission failures without losing audio or leaking private errors', function () {
    Log::spy();
    $id = $this->postJson('/api/v1/rapat/meetings', $this->payload)->json('data.id');
    $url = '/api/v1/rapat/meetings/'.$id;
    $this->post($url.'/media', ['file' => rapatAudio(), 'clientId' => (string) Str::uuid(), 'sequence' => 1], ['Accept' => 'application/json'])->assertCreated();
    $this->postJson($url.'/transcribe', ['version' => Meeting::find($id)->version])->assertAccepted();
    $temp = new class extends TemporaryAudio
    {
        public function withFile(string $bytes, callable $use): mixed
        {
            throw new ErrorException('mkdir permission denied PRIVATE AUDIO /private/path');
        }
    };
    (new ProcessMeeting($id, Meeting::find($id)->run_token, false, true))->handle(app(LocalEngine::class), $temp);
    $this->getJson($url)->assertJsonPath('data.status', 'failed')->assertJsonPath('data.transcript', '')
        ->assertJsonPath('data.minutes.summary', '')->assertDontSee('PRIVATE AUDIO')
        ->assertJsonPath('data.error', 'Worker tidak dapat menyiapkan audio sementara. Minta admin memeriksa izin folder sementara. Rekaman tetap tersimpan.');
    Storage::disk('local')->assertExists(Media::where('meeting_id', $id)->first()->path);
    Log::shouldHaveReceived('warning')->once()->with('rapat_processing_failed', Mockery::on(fn ($context) => $context['stage'] === 'temporary_audio' && $context['exception'] === ErrorException::class
        && ! str_contains(json_encode($context), 'PRIVATE AUDIO') && ! str_contains(json_encode($context), '/private/path')));
});

it('identifies unreadable encrypted audio before running Whisper', function () {
    Log::spy();
    $id = $this->postJson('/api/v1/rapat/meetings', $this->payload)->json('data.id');
    $url = '/api/v1/rapat/meetings/'.$id;
    $this->post($url.'/media', ['file' => rapatAudio(), 'clientId' => (string) Str::uuid(), 'sequence' => 1], ['Accept' => 'application/json'])->assertCreated();
    Storage::disk('local')->delete(Media::where('meeting_id', $id)->first()->path);
    $this->postJson($url.'/transcribe', ['version' => Meeting::find($id)->version])->assertAccepted();
    $engine = Mockery::mock(LocalEngine::class);
    $engine->shouldReceive('transcriptionRevision')->once()->andReturn('test');
    $engine->shouldNotReceive('run');
    (new ProcessMeeting($id, Meeting::find($id)->run_token, false, true))->handle($engine);
    $this->getJson($url)->assertJsonPath('data.status', 'failed')
        ->assertJsonPath('data.error', 'Audio tersimpan belum dapat dibaca oleh worker. Minta admin memeriksa akses penyimpanan privat. Rekaman tetap tersimpan.');
    Log::shouldHaveReceived('warning')->once()->with('rapat_processing_failed', Mockery::on(fn ($context) => $context['stage'] === 'read_audio'));
});

it('preserves only allowlisted engine failure codes and never logs raw engine output', function () {
    $script = tempnam(sys_get_temp_dir(), 'rapat_error_');
    try {
        config(['rapat.python' => PHP_BINARY, 'rapat.engine' => $script]);
        foreach (['whisper_model_missing', 'audio_decode_failed', 'transcription_failed', 'PRIVATE secret /path'] as $reason) {
            file_put_contents($script, '<?php echo '.var_export(json_encode(['error' => ['code' => $reason, 'message' => 'PRIVATE AUDIO']]), true).';exit(1);');
            try {
                (new LocalEngine)->run(['operation' => 'transcribe']);
                $this->fail('Engine error must fail.');
            } catch (LocalEngineFailure $error) {
                expect($error->reason)->toBe(str_starts_with($reason, 'PRIVATE') ? 'runtime_failed' : $reason);
                expect($error->getMessage())->toBe('Mesin AI lokal tidak tersedia.');
            }
        }
    } finally {
        unlink($script);
    }
});

it('supports a real local Whisper transcription through encrypted upload and queued job', function () {
    $sample = getenv('RAPAT_REAL_ASR_SAMPLE');
    $python = getenv('RAPAT_REAL_ASR_PYTHON');
    $models = getenv('RAPAT_REAL_ASR_MODELS');
    if (! $sample || ! $python || ! $models) {
        $this->markTestSkipped('Opt-in real local ASR smoke test; no audio/model is bundled.');
    }
    config(['rapat.python' => $python, 'rapat.model_dirs' => ['RAPAT_MODEL_DIR' => $models, 'RAPAT_WHISPER_MODEL' => 'small', 'RAPAT_OLLAMA_URL' => 'http://127.0.0.1:11434', 'RAPAT_OLLAMA_MODEL' => 'qwen3.5:0.8b-q8_0']]);
    $engine = new LocalEngine;
    $this->app->instance(LocalEngine::class, $engine);
    $id = $this->postJson('/api/v1/rapat/meetings', $this->payload)->assertCreated()->json('data.id');
    $url = '/api/v1/rapat/meetings/'.$id;
    $file = new UploadedFile($sample, 'sample.'.strtolower(pathinfo($sample, PATHINFO_EXTENSION)), null, null, true);
    $this->post($url.'/media', ['file' => $file, 'clientId' => (string) Str::uuid(), 'sequence' => 1], ['Accept' => 'application/json'])->assertCreated();
    $this->postJson($url.'/transcribe', ['version' => Meeting::find($id)->version])->assertAccepted();
    (new ProcessMeeting($id, Meeting::find($id)->run_token, false, true))->handle($engine);
    $meeting = Meeting::findOrFail($id);
    expect($meeting->status)->toBe('ready');
    expect(mb_strlen($meeting->payload['transcript']))->toBeGreaterThan(20);
    expect(count($meeting->payload['segments']))->toBeGreaterThan(0);
    expect($meeting->payload['minutes'])->toBe(RapatData::minutes());
    expect(Media::where('meeting_id', $id)->first()->transcribed)->toBeTrue();
});

it('creates without any metadata and ignores empty participant rows', function () {
    $this->travelTo(Carbon::parse('2026-11-24 23:30:00', 'UTC'));
    $created = $this->postJson('/api/v1/rapat/meetings', [])->assertCreated()
        ->assertJsonPath('data.meetingDate', '2026-11-25')->assertJsonPath('data.participants', [])
        ->assertJsonPath('data.template', 'dinas');
    expect($created->json('data.title'))->toBe('Rapat 25-11-2026 06.30');
    $id = $created->json('data.id');
    $this->putJson('/api/v1/rapat/meetings/'.$id, ['version' => 1, 'title' => '', 'meetingDate' => '',
        'participants' => [['name' => '  ', 'position' => ''], ['name' => 'Aisyah']]])->assertOk()
        ->assertJsonPath('data.title', 'Rapat 25-11-2026 06.30')->assertJsonPath('data.meetingDate', '2026-11-25')
        ->assertJsonCount(1, 'data.participants')->assertJsonPath('data.participants.0.name', 'Aisyah');
    $this->travelBack();
});

it('retires all removed endpoints and manual minutes without changing private legacy data', function () {
    $id = $this->postJson('/api/v1/rapat/meetings', [])->assertCreated()->json('data.id');
    $m = Meeting::find($id);
    $m->payload = [...$m->payload, 'minutes' => ['summary' => 'Catatan lama privat', 'discussion' => [], 'decisions' => [], 'actions' => []]];
    $m->save();
    $path = 'private/rapat/attachments/legacy.enc';
    Storage::disk('local')->put($path, 'encrypted-legacy-file');
    $attachment = Attachment::create(['id' => (string) Str::uuid(), 'meeting_id' => $id,
        'path' => $path, 'name' => 'legacy.pdf', 'mime' => 'application/pdf', 'size' => 21]);
    $snapshot = $m->getRawOriginal('payload');
    foreach ([['GET', 'settings'], ['PUT', 'settings'], ['GET', 'tasks'], ['GET', "meetings/$id/history"],
        ['POST', "meetings/$id/generate"], ['POST', "meetings/$id/finalize"], ['PUT', "meetings/$id/actions/0"],
        ['GET', "meetings/$id/docx"], ['GET', "meetings/$id/attachments"], ['POST', "meetings/$id/attachments"],
        ['GET', 'attachments/'.$attachment->id], ['DELETE', 'attachments/'.$attachment->id]] as [$method,$route]) {
        $this->json($method, '/api/v1/rapat/'.$route, ['version' => 1])->assertStatus(410);
    }
    $this->postJson('/api/v1/rapat/meetings', ['minutes' => RapatData::minutes()])->assertStatus(410);
    $this->putJson('/api/v1/rapat/meetings/'.$id, ['version' => 1, 'minutes' => RapatData::minutes()])->assertStatus(410);
    expect($m->refresh()->getRawOriginal('payload'))->toBe($snapshot);
    expect($m->version)->toBe(1);
    expect($attachment->refresh()->deleted_at)->toBeNull();
    Storage::disk('local')->assertExists($path);
    Queue::assertNothingPushed();
});

it('allows transcript corrections in legacy finalized records while preserving old minutes', function () {
    $id = $this->postJson('/api/v1/rapat/meetings', [])->assertCreated()->json('data.id');
    $m = Meeting::find($id);
    $m->payload = [...$m->payload, 'workflowStatus' => 'finalized', 'minutes' => ['summary' => 'Hasil rapat lama', 'discussion' => [], 'decisions' => [], 'actions' => []]];
    $m->save();
    $this->putJson('/api/v1/rapat/meetings/'.$id, ['version' => 1, 'transcript' => 'Koreksi transkrip.'])->assertOk()
        ->assertJsonPath('data.transcript', 'Koreksi transkrip.')->assertJsonPath('data.minutes.summary', 'Hasil rapat lama')
        ->assertJsonPath('data.workflowStatus', 'finalized');
});

it('counts transcription status across all filtered pages and searches transcripts instead of legacy minutes', function () {
    foreach (['ready', 'ready', 'processing', 'failed', 'draft'] as $status) {
        $id = $this->postJson('/api/v1/rapat/meetings', [])->assertCreated()->json('data.id');
        $m = Meeting::find($id);
        $m->status = $status;
        $m->payload = [...$m->payload, 'transcript' => 'Kata transkrip khusus', 'minutes' => [...RapatData::minutes(), 'summary' => 'notulenlegasi']];
        $m->save();
    }
    $this->getJson('/api/v1/rapat/meetings?perPage=1')->assertOk()->assertJsonCount(1, 'data')
        ->assertJsonPath('meta.stats.ready', 2)->assertJsonPath('meta.stats.processing', 1)->assertJsonPath('meta.stats.failed', 1)
        ->assertJsonPath('meta.total', 5);
    $this->getJson('/api/v1/rapat/meetings?q=transkrip')->assertJsonPath('meta.total', 5);
    $this->getJson('/api/v1/rapat/meetings?q=notulenlegasi')->assertJsonPath('meta.total', 0);
});

it('finishes legacy queued generation as transcript only without using a summarizer', function () {
    $id = $this->postJson('/api/v1/rapat/meetings', ['transcript' => 'Transkrip yang sudah ada.'])->assertCreated()->json('data.id');
    $m = Meeting::find($id);
    $m->status = 'processing';
    $m->run_token = (string) Str::uuid();
    $m->payload = [...$m->payload, 'processingMode' => 'minutes'];
    $m->save();
    $engine = new class extends LocalEngine
    {
        public function run(array $input): array
        {
            throw new RuntimeException('Must not invoke a model');
        }
    };
    (new ProcessMeeting($id, $m->run_token, true))->handle($engine);
    $this->getJson('/api/v1/rapat/meetings/'.$id)->assertOk()->assertJsonPath('data.status', 'ready')
        ->assertJsonPath('data.transcript', 'Transkrip yang sudah ada.')->assertJsonPath('data.minutes.summary', '');
});

it('reports configured when only Whisper is ready and blocks direct minutes operations', function () {
    $engine = new class extends LocalEngine
    {
        public function run(array $input): array
        {
            return ['provider' => 'local', 'transcriberReady' => true, 'summarizerReady' => false];
        }
    };
    expect($engine->health())->toBe(['provider' => 'local', 'transcriberReady' => true, 'summarizerReady' => false, 'configured' => true]);
    expect(fn () => (new LocalEngine)->run(['operation' => 'minutes', 'transcript' => 'Private']))->toThrow(LocalEngineFailure::class);
});
