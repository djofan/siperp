<?php

use App\Modules\Core\Models\User;
use App\Modules\Tanwir\Models\TanwirGroup;
use App\Modules\Tanwir\Models\TanwirMember;
use App\Modules\Tanwir\Models\TanwirSubmission;
use App\Modules\Tanwir\Models\TanwirTask;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function tanwirMember(string $role, ?string $group = null): TanwirMember
{
    $user = new User;
    $user->forceFill(['name' => $role, 'email' => Str::uuid().'@example.test', 'password_hash' => Hash::make('password-tanwir-test'), 'is_active' => true, 'is_superadmin' => false])->save();
    $member = new TanwirMember;
    $member->forceFill(['userId' => $user->id, 'code' => ($role === 'guru' ? 'GTQ' : 'PTQ').strtoupper(Str::random(8)), 'role' => $role, 'groupId' => $group])->save();

    return $member;
}

function tanwirTaskInput(array $overrides = []): array
{
    return [...['title' => 'Setoran uji', 'description' => 'Baca surah Al-Mulk', 'type' => 'voice_note', 'deadline' => now()->addDay()->timezone('Asia/Jakarta')->format('Y-m-d\TH:i')], ...$overrides];
}

function tanwirAudio(): UploadedFile
{
    return UploadedFile::fake()->createWithContent('setoran.wav', 'RIFF'.pack('V', 40).'WAVEfmt '.str_repeat("\0", 32));
}

function tanwirMp4(array $handlers, string $brand = 'isom'): UploadedFile
{
    $box = fn ($type, $body) => pack('N', strlen($body) + 8).$type.$body;
    $tracks = '';
    foreach ($handlers as $handler) {
        $tracks .= $box('trak', $box('mdia', $box('hdlr', str_repeat("\0", 8).$handler.str_repeat("\0", 12))));
    }

    return UploadedFile::fake()->createWithContent('recording.mp4', $box('ftyp', $brand.str_repeat("\0", 4).'isom').$box('moov', $tracks));
}

beforeEach(function () {
    Storage::fake('local');
    $this->travelTo(now()->startOfMinute()->addSeconds(25));
    DB::table('modules')->insert(['id' => (string) Str::uuid(), 'slug' => 'tanwir', 'name' => 'Tanwir Qurani', 'is_active' => true]);
    $this->teacher = tanwirMember('guru');
    $this->otherTeacher = tanwirMember('guru');
    $group = new TanwirGroup;
    $group->forceFill(['code' => 'TQ001', 'name' => 'Kelompok uji', 'picId' => $this->teacher->id])->save();
    $this->group = $group;
    $this->student = tanwirMember('peserta', $group->id);
    $this->outsider = tanwirMember('peserta');
    $this->admin = new User;
    $this->admin->forceFill(['name' => 'Admin', 'email' => 'admin@example.test', 'password_hash' => Hash::make('password-tanwir-test'), 'is_active' => true, 'is_superadmin' => true])->save();
});

it('authenticates account codes and refuses inactive accounts', function () {
    $input = ['code' => $this->student->code, 'password' => 'password-tanwir-test'];
    $this->postJson('/api/v1/tanwir/auth/login', $input)->assertOk()->assertJsonPath('redirectTo', '/tanwir/peserta')->assertCookie('sip_session');
    $this->student->user->forceFill(['is_active' => false])->save();
    $this->postJson('/api/v1/tanwir/auth/login', $input)->assertForbidden();
});

it('creates accounts and groups with immutable automatic codes and admin-only access', function () {
    $this->actingAs($this->student->user, 'sanctum')->postJson('/api/v1/tanwir/members', [])->assertForbidden();
    $id = $this->actingAs($this->admin, 'sanctum')->postJson('/api/v1/tanwir/members', ['name' => 'Guru baru', 'role' => 'guru', 'password' => 'password-tanwir-test', 'isActive' => true])->assertCreated()->json('data.id');
    $member = TanwirMember::findOrFail($id);
    expect($member->code)->toStartWith('GTQ')->and($member->user->email)->toEndWith('.invalid');
    $code = $member->code;
    $this->putJson('/api/v1/tanwir/members/'.$id, ['name' => 'Nama baru', 'code' => 'GTQ999', 'isActive' => true])->assertOk();
    expect($member->refresh()->code)->toBe($code);
    $this->postJson('/api/v1/tanwir/groups', ['name' => 'Tanpa PIC'])->assertUnprocessable();
    $this->postJson('/api/v1/tanwir/groups', ['name' => 'Kelompok baru', 'picId' => $id])->assertCreated();
    $this->getJson('/api/v1/tanwir/dashboard/admin')->assertOk();
});

it('completes rejection resubmission approval and protects private files', function () {
    $task = $this->actingAs($this->teacher->user, 'sanctum')->postJson('/api/v1/tanwir/tasks', tanwirTaskInput())->assertCreated()->json('data.id');
    $this->actingAs($this->outsider->user, 'sanctum')->getJson('/api/v1/tanwir/student/tasks/'.$task)->assertNotFound();
    $this->getJson('/api/v1/tanwir/student/tasks')->assertJsonCount(0, 'data');
    $this->actingAs($this->student->user, 'sanctum')->post('/api/v1/tanwir/submissions', ['taskId' => $task, 'file' => tanwirAudio()], ['Accept' => 'application/json'])->assertOk();
    $row = TanwirSubmission::where('task_id', $task)->firstOrFail();
    $before = $row->filePath;
    $this->post('/api/v1/tanwir/submissions', ['taskId' => $task, 'file' => tanwirAudio()], ['Accept' => 'application/json'])->assertConflict();
    $this->get('/api/v1/tanwir/files/submission/'.$row->id)->assertOk();
    $this->actingAs($this->otherTeacher->user, 'sanctum')->get('/api/v1/tanwir/files/submission/'.$row->id)->assertNotFound();
    $this->postJson('/api/v1/tanwir/submissions/'.$row->id.'/reviews', ['decision' => 'approved'])->assertNotFound();
    $this->actingAs($this->teacher->user, 'sanctum')->postJson('/api/v1/tanwir/submissions/'.$row->id.'/reviews', ['decision' => 'rejected'])->assertUnprocessable();
    $this->postJson('/api/v1/tanwir/submissions/'.$row->id.'/reviews', ['decision' => 'rejected', 'feedback' => 'Ulangi tajwid'])->assertOk();
    $this->actingAs($this->student->user, 'sanctum')->post('/api/v1/tanwir/submissions', ['taskId' => $task, 'file' => tanwirAudio()], ['Accept' => 'application/json'])->assertOk();
    Storage::disk('local')->assertMissing('tanwir/'.$before);
    expect($row->refresh()->attemptsCount)->toBe(2);
    $this->actingAs($this->teacher->user, 'sanctum')->postJson('/api/v1/tanwir/submissions/'.$row->id.'/reviews', ['decision' => 'approved'])->assertOk();
    expect($row->refresh()->logs()->count())->toBe(2)->and($row->status)->toBe('approved');
    $this->actingAs($this->admin, 'sanctum')->get('/api/v1/tanwir/files/submission/'.$row->id)->assertOk();
});

it('locks submitted deadlines and preserves extension seconds when editing text', function () {
    $input = tanwirTaskInput();
    $id = $this->actingAs($this->teacher->user, 'sanctum')->postJson('/api/v1/tanwir/tasks', $input)->json('data.id');
    $this->actingAs($this->student->user, 'sanctum')->post('/api/v1/tanwir/submissions', ['taskId' => $id, 'file' => tanwirAudio()], ['Accept' => 'application/json'])->assertOk();
    $this->actingAs($this->teacher->user, 'sanctum')->putJson('/api/v1/tanwir/tasks/'.$id, tanwirTaskInput(['deadline' => now()->addDays(2)->timezone('Asia/Jakarta')->format('Y-m-d\TH:i')]))->assertUnprocessable();
    $this->postJson('/api/v1/tanwir/tasks/'.$id.'/extensions', ['hours' => 2])->assertConflict();
    $original = TanwirTask::findOrFail($id)->originalDeadline;
    $this->travel(2)->days();
    $lateStudent = tanwirMember('peserta', $this->group->id);
    $this->actingAs($lateStudent->user, 'sanctum')->post('/api/v1/tanwir/submissions', ['taskId' => $id, 'file' => tanwirAudio()], ['Accept' => 'application/json'])->assertConflict();
    $this->actingAs($this->otherTeacher->user, 'sanctum')->postJson('/api/v1/tanwir/tasks/'.$id.'/extensions', ['hours' => 2])->assertNotFound();
    $this->actingAs($this->teacher->user, 'sanctum')->postJson('/api/v1/tanwir/tasks/'.$id.'/extensions', ['hours' => 73])->assertUnprocessable();
    $this->postJson('/api/v1/tanwir/tasks/'.$id.'/extensions', ['hours' => 2])->assertOk();
    $task = TanwirTask::findOrFail($id);
    $deadline = $task->deadline;
    $this->putJson('/api/v1/tanwir/tasks/'.$id, [...$input, 'title' => 'Judul diperbarui', 'deadline' => $deadline->timezone('Asia/Jakarta')->format('Y-m-d\TH:i')])->assertOk();
    expect($task->refresh()->deadline->equalTo($deadline))->toBeTrue()->and($task->originalDeadline->equalTo($original))->toBeTrue();
    $second = tanwirMember('peserta', $this->group->id);
    $this->actingAs($second->user, 'sanctum')->post('/api/v1/tanwir/submissions', ['taskId' => $id, 'file' => tanwirAudio()], ['Accept' => 'application/json'])->assertOk()->assertJsonPath('isLate', true);
});

it('scores a quiz once without exposing keys and rejects missing or empty choices', function () {
    $input = tanwirTaskInput(['type' => 'quiz', 'questions' => [
        ['question' => 'Soal satu', 'optionA' => 'Benar', 'optionB' => 'Salah', 'correctOption' => 'a'],
        ['question' => 'Soal dua', 'optionA' => 'Salah', 'optionB' => 'Benar', 'correctOption' => 'b'],
    ]]);
    $id = $this->actingAs($this->teacher->user, 'sanctum')->postJson('/api/v1/tanwir/tasks', $input)->assertCreated()->json('data.id');
    $detail = $this->actingAs($this->student->user, 'sanctum')->getJson('/api/v1/tanwir/student/tasks/'.$id)->assertOk();
    $questions = $detail->json('data.questions');
    expect($questions[0])->not->toHaveKey('correctOption');
    $this->postJson('/api/v1/tanwir/tasks/'.$id.'/quiz-attempts', ['answers' => [$questions[0]['id'] => 'a']])->assertUnprocessable();
    $this->postJson('/api/v1/tanwir/tasks/'.$id.'/quiz-attempts', ['answers' => [$questions[0]['id'] => 'c', $questions[1]['id'] => 'b']])->assertUnprocessable();
    $answers = [$questions[0]['id'] => 'a', $questions[1]['id'] => 'a'];
    $this->postJson('/api/v1/tanwir/tasks/'.$id.'/quiz-attempts', ['answers' => $answers])->assertCreated()->assertJsonPath('data.score', 50);
    $this->postJson('/api/v1/tanwir/tasks/'.$id.'/quiz-attempts', ['answers' => $answers])->assertConflict();
    $this->actingAs($this->teacher->user, 'sanctum')->putJson('/api/v1/tanwir/tasks/'.$id, [...$input, 'questions' => [['question' => 'Thay đổi', 'optionA' => 'A', 'optionB' => 'B', 'correctOption' => 'b']]])->assertOk();
    expect(TanwirTask::findOrFail($id)->questions()->orderBy('order')->pluck('question')->all())->toBe(['Soal satu', 'Soal dua']);
    $this->putJson('/api/v1/tanwir/tasks/'.$id, [...$input, 'type' => 'video'])->assertUnprocessable();
    $this->actingAs($this->teacher->user, 'sanctum')->getJson('/api/v1/tanwir/review-queue')->assertJsonCount(0, 'data');
    $row = TanwirSubmission::where('task_id', $id)->firstOrFail();
    $this->getJson('/api/v1/tanwir/submissions/'.$row->id)->assertOk()->assertJsonCount(2, 'data.answers');
});

it('rejects oversized uploads and denies disabled accounts or modules', function () {
    $id = $this->actingAs($this->teacher->user, 'sanctum')->postJson('/api/v1/tanwir/tasks', tanwirTaskInput())->json('data.id');
    $this->actingAs($this->student->user, 'sanctum')->post('/api/v1/tanwir/submissions', ['taskId' => $id, 'file' => UploadedFile::fake()->create('huge.wav', 51201)], ['Accept' => 'application/json'])->assertUnprocessable();
    $this->student->user->forceFill(['is_active' => false])->save();
    $this->actingAs($this->student->user, 'sanctum')->getJson('/api/v1/tanwir/student/tasks')->assertUnauthorized();
    DB::table('modules')->where('slug', 'tanwir')->update(['is_active' => false]);
    $this->actingAs($this->teacher->user, 'sanctum')->getJson('/api/v1/tanwir/tasks')->assertNotFound();
    $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/tanwir/dashboard/admin')->assertOk();
});

it('recognizes MP4 audio tracks independently of brands and rejects video for voice tasks', function () {
    $id = $this->actingAs($this->teacher->user, 'sanctum')->postJson('/api/v1/tanwir/tasks', tanwirTaskInput())->json('data.id');
    $this->actingAs($this->student->user, 'sanctum')->post('/api/v1/tanwir/submissions', ['taskId' => $id, 'file' => tanwirMp4(['vide', 'soun'], 'M4A ')], ['Accept' => 'application/json'])->assertUnprocessable();
    $this->post('/api/v1/tanwir/submissions', ['taskId' => $id, 'file' => UploadedFile::fake()->createWithContent('fake.mp4', 'not a media file')], ['Accept' => 'application/json'])->assertUnprocessable();
    $this->post('/api/v1/tanwir/submissions', ['taskId' => $id, 'file' => tanwirMp4(['soun'])], ['Accept' => 'application/json'])->assertOk();
    expect(TanwirSubmission::where('task_id', $id)->value('file_mime'))->toBe('audio/mp4');
});

it('scopes child records and photos to their owner teacher and admin', function () {
    $this->actingAs($this->student->user, 'sanctum')->postJson('/api/v1/tanwir/students', ['name' => 'Santri uji', 'parentPhone' => '08123456789'])->assertCreated();
    $id = DB::table('tanwir_students')->value('id');
    Storage::disk('local')->put('tanwir/photos/test.png', 'private photo');
    $this->student->forceFill(['photo' => 'photos/test.png'])->save();
    $photo = '/api/v1/tanwir/files/photo/'.$this->student->id;
    $this->get($photo)->assertOk();
    $this->actingAs($this->outsider->user, 'sanctum')->get($photo)->assertNotFound();
    $this->getJson('/api/v1/tanwir/students/'.$id)->assertNotFound();
    $this->actingAs($this->otherTeacher->user, 'sanctum')->get($photo)->assertNotFound();
    $this->getJson('/api/v1/tanwir/students/'.$id)->assertNotFound();
    $this->actingAs($this->teacher->user, 'sanctum')->get($photo)->assertOk();
    $this->putJson('/api/v1/tanwir/students/'.$id, ['name' => 'Santri diperbarui', 'memberId' => $this->student->id])->assertOk();
    $this->actingAs($this->admin, 'sanctum')->getJson('/api/v1/tanwir/students/'.$id)->assertOk()->assertJsonPath('data.name', 'Santri diperbarui');
    $this->deleteJson('/api/v1/tanwir/students/'.$id)->assertOk();
});

it('updates the own profile and changes a password only with valid current credentials', function () {
    $this->actingAs($this->student->user, 'sanctum')->putJson('/api/v1/tanwir/profile', ['name' => 'Peserta diperbarui', 'phone' => '08123456789', 'teachingPlace' => 'TPQ uji'])->assertOk();
    $this->getJson('/api/v1/tanwir/profile')->assertOk()->assertJsonPath('data.user.name', 'Peserta diperbarui')->assertJsonPath('data.teachingPlace', 'TPQ uji');
    $this->putJson('/api/v1/tanwir/profile/password', ['currentPassword' => 'wrong-password', 'password' => 'new-password-test', 'passwordConfirm' => 'new-password-test'])->assertUnprocessable();
    $this->putJson('/api/v1/tanwir/profile/password', ['currentPassword' => 'password-tanwir-test', 'password' => 'new-password-test', 'passwordConfirm' => 'new-password-test'])->assertOk();
    expect(Hash::check('new-password-test', $this->student->user->fresh()->password_hash))->toBeTrue();
});
