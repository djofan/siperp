<?php

use App\Modules\Core\Services\UserService;
use App\Modules\Rapat\Models\Attachment;
use App\Modules\Rapat\Models\Meeting;
use App\Modules\Rapat\Providers\RapatServiceProvider;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

function rapatAttachmentActor(string $role)
{
    $user = app(UserService::class)->create(['name' => 'Attachment '.$role, 'password' => 'only-test-password']);
    DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'user_id' => $user->id, 'module_id' => 'module-rapat', 'role' => $role]);

    return $user;
}

function rapatAttachmentOffice(string $extension, array $extra = [], bool $includeMain = true, bool $prefixed = false): UploadedFile
{
    $parts = ['docx' => ['word/document.xml', 'wordprocessingml.document'],
        'xlsx' => ['xl/workbook.xml', 'spreadsheetml.sheet'], 'pptx' => ['ppt/presentation.xml', 'presentationml.presentation']];
    [$main, $type] = $parts[$extension];
    $path = tempnam(sys_get_temp_dir(), 'rapat-office-test-');
    $zip = new ZipArchive;
    $zip->open($path, ZipArchive::OVERWRITE);
    $prefix = $prefixed ? 'ct:' : '';
    $namespace = $prefixed ? 'xmlns:ct' : 'xmlns';
    $zip->addFromString('[Content_Types].xml', '<'.$prefix.'Types '.$namespace.'="http://schemas.openxmlformats.org/package/2006/content-types"><'.$prefix.'Override PartName="/'.$main.'" ContentType="application/vnd.openxmlformats-officedocument.'.$type.'.main+xml"/></'.$prefix.'Types>');
    $zip->addFromString('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>');
    if ($includeMain) {
        $zip->addFromString($main, '<document/>');
    }
    foreach ($extra as $name => $bytes) {
        $zip->addFromString($name, $bytes);
    }
    $zip->close();
    $file = UploadedFile::fake()->createWithContent('dokumen.'.$extension, file_get_contents($path));
    unlink($path);

    return $file;
}

beforeEach(function () {
    if (! app()->providerIsLoaded(RapatServiceProvider::class)) {
        app()->register(RapatServiceProvider::class);
    }
    // Other agents may run their own suites concurrently; do not share their fake root.
    Storage::set('local', Storage::fake('rapat-attachments-'.getmypid()));
    $this->actor = rapatAttachmentActor('secretary');
    Sanctum::actingAs($this->actor);
    $this->meeting = Meeting::create(['id' => (string) Str::uuid(), 'created_by' => $this->actor->id,
        'meeting_date' => '2026-11-20', 'status' => 'draft', 'version' => 1, 'payload' => ['title' => 'Private meeting']]);
    $this->collection = '/api/v1/rapat/meetings/'.$this->meeting->id.'/attachments';
    $this->upload = fn ($file = null, $version = 1) => $this->post($this->collection,
        ['file' => $file ?? UploadedFile::fake()->createWithContent('catatan.txt', 'Private supporting document'), 'version' => $version], ['Accept' => 'application/json']);
    $this->attachmentUrl = fn ($id) => '/api/v1/rapat/attachments/'.$id;
});

it('encrypts bytes and bounded metadata lists explicit fields and downloads private UTF8 files', function () {
    $response = ($this->upload)(UploadedFile::fake()->createWithContent('Catatan résumé.txt', 'Private supporting document'))
        ->assertCreated()->assertHeader('Cache-Control', 'no-store, private');
    $id = $response->json('data.id');
    $response->assertHeader('Location', '/api/v1/rapat/attachments/'.$id);
    expect(array_keys($response->json('data')))->toBe(['id', 'name', 'mime', 'size', 'createdAt']);
    $attachment = Attachment::findOrFail($id);
    expect(DB::table('rapat_attachments')->value('name'))->not->toContain('Catatan');
    $encrypted = Storage::disk('local')->get($attachment->path);
    expect($encrypted)->not->toContain('Private supporting document');
    expect(Crypt::decryptString($encrypted))->toBe('Private supporting document');
    expect($this->meeting->fresh()->version)->toBe(2);
    $revision = DB::table('rapat_revisions')->where('meeting_id', $this->meeting->id)->sole();
    expect($revision->version)->toBe(2);
    expect($revision->payload)->not->toContain('Catatan');
    $history = json_decode(Crypt::decryptString($revision->payload), true, 512, JSON_THROW_ON_ERROR);
    expect($history['action'])->toBe('attachment_added');
    expect($history['changedFields'])->toBe(['attachments']);
    expect($history['actor']['id'])->toBe($this->actor->id);
    expect($history['reason'])->toBe('Catatan résumé.txt');
    expect(json_encode($history))->not->toContain('rapat/attachments/');
    $this->getJson($this->collection)->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.name', 'Catatan résumé.txt');
    $download = $this->get(($this->attachmentUrl)($id))->assertOk()
        ->assertHeader('Cache-Control', 'no-store, private')->assertHeader('X-Content-Type-Options', 'nosniff')
        ->assertHeader('Content-Type', 'text/plain; charset=utf-8');
    expect($download->headers->get('Content-Disposition'))->toContain('attachment;', "filename*=utf-8''");
    expect($download->getContent())->toBe('Private supporting document');
});

it('scopes secretary and permits reader access only with active authorized roles', function () {
    $id = ($this->upload)()->assertCreated()->json('data.id');
    $url = ($this->attachmentUrl)($id);
    Sanctum::actingAs(rapatAttachmentActor('secretary'));
    $this->getJson($this->collection)->assertNotFound();
    $this->getJson($url)->assertNotFound();
    ($this->upload)(null, 2)->assertNotFound();
    $this->deleteJson($url, ['version' => 2])->assertNotFound();
    Sanctum::actingAs(rapatAttachmentActor('viewer'));
    $this->getJson($this->collection)->assertOk();
    $this->get($url)->assertOk();
    ($this->upload)(null, 2)->assertForbidden();
    $this->deleteJson($url, ['version' => 2])->assertForbidden();
    Sanctum::actingAs(rapatAttachmentActor('admin'));
    ($this->upload)(null, 2)->assertCreated();
    $this->deleteJson($url, ['version' => 3])->assertNoContent();
    Sanctum::actingAs(rapatAttachmentActor('unknown'));
    $this->getJson($this->collection)->assertForbidden();
    $this->app['auth']->forgetGuards();
    $this->getJson($this->collection)->assertUnauthorized();
});

it('requires optimistic versions and soft deletes while keeping encrypted files', function () {
    $this->post($this->collection, ['file' => UploadedFile::fake()->createWithContent('a.txt', 'text')], ['Accept' => 'application/json'])->assertUnprocessable();
    $id = ($this->upload)()->assertCreated()->json('data.id');
    $path = Attachment::find($id)->path;
    ($this->upload)(null, 1)->assertConflict();
    $this->deleteJson(($this->attachmentUrl)($id))->assertUnprocessable();
    $this->deleteJson(($this->attachmentUrl)($id), ['version' => 1])->assertConflict();
    $this->deleteJson(($this->attachmentUrl)($id), ['version' => 2])->assertNoContent();
    expect($this->meeting->fresh()->version)->toBe(3);
    $last = DB::table('rapat_revisions')->where('meeting_id', $this->meeting->id)->orderByDesc('version')->first();
    expect(json_decode(Crypt::decryptString($last->payload), true)['action'])->toBe('attachment_removed');
    expect(DB::table('rapat_revisions')->where('meeting_id', $this->meeting->id)->count())->toBe(2);
    expect(Attachment::withTrashed()->find($id)->trashed())->toBeTrue();
    Storage::disk('local')->assertExists($path);
    $this->getJson(($this->attachmentUrl)($id))->assertNotFound();
    $this->deleteJson(($this->attachmentUrl)($id), ['version' => 3])->assertNotFound();
    $this->getJson($this->collection)->assertJsonCount(0, 'data');
});

it('locks writes for processing finalized and archived meetings while retaining reads', function () {
    $id = ($this->upload)()->assertCreated()->json('data.id');
    foreach ([['status' => 'processing'],
        ['status' => 'draft', 'payload' => ['title' => 'Private meeting', 'workflowStatus' => 'finalized']],
        ['status' => 'draft', 'payload' => ['title' => 'Private meeting', 'workflowStatus' => 'draft'], 'archived_at' => now()]] as $state) {
        $this->meeting->forceFill($state)->save();
        ($this->upload)(null, 2)->assertConflict();
        $this->deleteJson(($this->attachmentUrl)($id), ['version' => 2])->assertConflict();
        $this->getJson($this->collection)->assertOk();
    }
    expect($this->meeting->fresh()->version)->toBe(2);
    expect(DB::table('rapat_revisions')->where('meeting_id', $this->meeting->id)->count())->toBe(1);
});

it('bounds encrypted original names and safely downloads a truncated unicode filename', function () {
    $name = 'note.'.str_repeat('é', 190).'.txt';
    $id = ($this->upload)(UploadedFile::fake()->createWithContent($name, 'Private note'))->assertCreated()->json('data.id');
    $attachment = Attachment::findOrFail($id);
    expect(mb_strlen($attachment->name))->toBe(191);
    $this->get(($this->attachmentUrl)($id))->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
});

it('enforces the active count and exact 10MiB limit without discarding old files', function () {
    $base = ['meeting_id' => $this->meeting->id, 'name' => 'old.txt', 'mime' => 'text/plain', 'size' => 1, 'path' => 'private.enc'];
    for ($i = 0; $i < 50; $i++) {
        Attachment::create(['id' => (string) Str::uuid(), ...$base]);
    }
    ($this->upload)()->assertConflict();
    Attachment::first()->delete();
    ($this->upload)(UploadedFile::fake()->createWithContent('large.txt', str_repeat('a', 10 * 1024 * 1024 + 1)))->assertUnprocessable();
    ($this->upload)(UploadedFile::fake()->createWithContent('limit.txt', str_repeat("catatan\n", 10 * 1024 * 1024 / 8)))->assertCreated();
    expect(Attachment::count())->toBe(50);
    expect(Attachment::withTrashed()->count())->toBe(51);
});

it('validates actual extension mime and Office package contents without extracting', function () {
    foreach ([['evil.pdf', '<?php echo 1;'], ['evil.html', '<html>hello</html>'], ['evil.svg', '<svg/>'],
        ['evil.txt', '<script>alert(1)</script>'], ['evil.exe', 'MZfake'], ['fake.png', 'plain text']] as [$name, $bytes]) {
        ($this->upload)(UploadedFile::fake()->createWithContent($name, $bytes))->assertUnprocessable();
    }
    $version = 1;
    foreach (['docx', 'xlsx', 'pptx'] as $ext) {
        ($this->upload)(rapatAttachmentOffice($ext, [], false), $version)->assertUnprocessable();
        ($this->upload)(rapatAttachmentOffice($ext), $version++)->assertCreated();
        ($this->upload)(rapatAttachmentOffice($ext, [], true, true), $version++)->assertCreated();
    }
    ($this->upload)(rapatAttachmentOffice('docx', ['../outside.txt' => 'bad']), $version)->assertUnprocessable();
    ($this->upload)(rapatAttachmentOffice('docx', ['word/vbaProject.bin' => 'macro']), $version)->assertUnprocessable();
    ($this->upload)(rapatAttachmentOffice('docx', ['huge.txt' => str_repeat('x', 50 * 1024 * 1024)]), $version)->assertUnprocessable();
    $extra = [];
    for ($i = 0; $i < 1000; $i++) {
        $extra['entry'.$i] = 'x';
    }
    ($this->upload)(rapatAttachmentOffice('docx', $extra), $version)->assertUnprocessable();
});

it('cleans up a newly written encrypted file when the database write fails', function () {
    $originalDispatcher = Attachment::getEventDispatcher();
    Attachment::setEventDispatcher(clone $originalDispatcher);
    Attachment::creating(function () {
        throw new RuntimeException('simulated database failure');
    });
    try {
        $this->withoutExceptionHandling();
        try {
            ($this->upload)();
            test()->fail('Expected write failure');
        } catch (RuntimeException $exception) {
            expect($exception->getMessage())->toBe('simulated database failure');
        }
        expect(Storage::disk('local')->allFiles('rapat/attachments'))->toBe([]);
        expect(Attachment::count())->toBe(0);
        expect($this->meeting->fresh()->version)->toBe(1);
    } finally {
        Attachment::setEventDispatcher($originalDispatcher);
    }
});

it('rolls back attachment meeting version and storage when encrypted history cannot be written', function () {
    DB::unprepared("CREATE TRIGGER fail_attachment_audit BEFORE INSERT ON rapat_revisions BEGIN SELECT RAISE(ABORT, 'simulated audit failure'); END");
    $this->withoutExceptionHandling();
    try {
        ($this->upload)();
        test()->fail('Expected audit write failure');
    } catch (QueryException $exception) {
        expect($exception->getMessage())->toContain('simulated audit failure');
    }
    expect(Attachment::count())->toBe(0);
    expect($this->meeting->fresh()->version)->toBe(1);
    expect(DB::table('rapat_revisions')->count())->toBe(0);
    expect(Storage::disk('local')->allFiles('rapat/attachments'))->toBe([]);
});
