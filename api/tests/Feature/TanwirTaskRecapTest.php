<?php

use App\Modules\Core\Models\User;
use App\Modules\Tanwir\Models\TanwirGroup;
use App\Modules\Tanwir\Models\TanwirMember;
use App\Modules\Tanwir\Models\TanwirQuizAnswer;
use App\Modules\Tanwir\Models\TanwirQuizQuestion;
use App\Modules\Tanwir\Models\TanwirSubmission;
use App\Modules\Tanwir\Models\TanwirSubmissionLog;
use App\Modules\Tanwir\Models\TanwirTask;
use App\Modules\Tanwir\Models\TanwirTaskGroup;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function recapMember(string $role, string $code, ?string $groupId = null): TanwirMember
{
    $user = new User;
    $user->forceFill(['name' => 'Nama '.$code, 'email' => $code.'@example.test', 'password_hash' => bcrypt('test-only-password'), 'is_active' => true])->save();
    $member = new TanwirMember;
    $member->forceFill(['userId' => $user->id, 'role' => $role, 'code' => $code, 'groupId' => $groupId])->save();

    return $member;
}

beforeEach(function () {
    Storage::fake('local');
    $this->module = (string) Str::uuid();
    DB::table('modules')->insert(['id' => $this->module, 'slug' => 'tanwir', 'name' => 'Tanwir', 'is_active' => true]);
    $this->pic = recapMember('guru', 'GTQ1');
    $this->otherPic = recapMember('guru', 'GTQ2');
    $this->group = new TanwirGroup;
    $this->group->forceFill(['code' => 'TQ1', 'name' => 'Kelompok satu', 'picId' => $this->pic->id])->save();
    $this->otherGroup = new TanwirGroup;
    $this->otherGroup->forceFill(['code' => 'TQ2', 'name' => 'Kelompok dua', 'picId' => $this->otherPic->id])->save();
    $this->student = recapMember('peserta', 'PTQ1', $this->group->id);
    $this->missing = recapMember('peserta', 'PTQ2', $this->group->id);
    $this->otherStudent = recapMember('peserta', 'PTQ3', $this->otherGroup->id);
    $this->task = new TanwirTask;
    $this->task->forceFill(['teacherId' => $this->pic->id, 'title' => 'Hafalan pekan satu', 'description' => 'Baca surah yang ditugaskan', 'type' => 'voice_note', 'deadline' => now()->addDay(), 'originalDeadline' => now()->addDay()])->save();
    (new TanwirTaskGroup)->forceFill(['taskId' => $this->task->id, 'groupId' => $this->group->id])->save();
    $this->sent = new TanwirSubmission;
    $this->sent->forceFill(['taskId' => $this->task->id, 'studentId' => $this->student->id, 'status' => 'pending', 'attemptsCount' => 2, 'submittedAt' => now(), 'isLate' => true, 'filePath' => 'submissions/old-private.wav', 'fileMime' => 'audio/wav'])->save();
    Storage::disk('local')->put('tanwir/submissions/old-private.wav', 'existing-private-media');
    (new TanwirSubmissionLog)->forceFill(['submissionId' => $this->sent->id, 'reviewerId' => $this->pic->id, 'status' => 'rejected', 'feedback' => 'Ulangi dengan lebih jelas', 'attemptNumber' => 1])->save();
    $this->admin = new User;
    $this->admin->forceFill(['name' => 'Admin Tanwir', 'email' => 'recap-admin@example.test', 'password_hash' => bcrypt('test-only-password'), 'is_active' => true])->save();
    DB::table('module_access')->insert(['id' => (string) Str::uuid(), 'user_id' => $this->admin->id, 'module_id' => $this->module, 'role' => 'admin']);
    $this->actingAs($this->admin, 'sanctum');
    $this->base = '/api/v1/tanwir/admin/task-recaps';
});

it('lists and filters PIC tasks with exact totals and all current group participants', function () {
    $this->getJson($this->base.'?teacher='.$this->pic->id.'&group='.$this->group->id)
        ->assertOk()->assertJsonCount(1, 'data.tasks')->assertJsonPath('data.tasks.0.teacher.code', 'GTQ1')
        ->assertJsonPath('data.tasks.0.counts.participants', 2)->assertJsonPath('data.tasks.0.counts.missing', 1)->assertJsonPath('data.tasks.0.counts.pending', 1);
    $this->getJson($this->base.'?teacher='.$this->otherPic->id)->assertOk()->assertJsonCount(0, 'data.tasks');
    $this->getJson($this->base.'?group='.$this->otherGroup->id)->assertOk()->assertJsonCount(0, 'data.tasks');
    $this->getJson($this->base.'?type=quiz')->assertOk()->assertJsonCount(0, 'data.tasks');
    $this->getJson($this->base.'?q=tidak-ada')->assertOk()->assertJsonCount(0, 'data.tasks');
    $this->missing->user->forceFill(['is_active' => false])->save();
    $detail = $this->getJson($this->base.'/'.$this->task->id)->assertOk()->assertJsonCount(2, 'data.participants')->assertJsonPath('data.summary.missing', 1);
    expect(collect($detail->json('data.participants'))->firstWhere('id', $this->missing->id)['active'])->toBeFalse();
    $this->getJson($this->base.'/'.$this->task->id.'?status=missing')->assertOk()->assertJsonCount(1, 'data.participants')->assertJsonPath('data.participants.0.submission', null);
    $this->getJson($this->base.'/'.$this->task->id.'?q=PTQ1')->assertOk()->assertJsonCount(1, 'data.participants')->assertJsonPath('data.participants.0.submission.attemptsCount', 2);
});

it('keeps transferred participants historical submissions visible without assigning new tasks to them', function () {
    $this->student->forceFill(['groupId' => $this->otherGroup->id])->save();
    $detail = $this->getJson($this->base.'/'.$this->task->id)->assertOk()->assertJsonPath('data.summary.participants', 2);
    $student = collect($detail->json('data.participants'))->firstWhere('id', $this->student->id);
    expect($student['currentlyAssigned'])->toBeFalse()->and($student['group']['id'])->toBe($this->otherGroup->id)->and($student['submission']['id'])->toBe($this->sent->id);
    $this->getJson($this->base.'/'.$this->task->id.'?group='.$this->otherGroup->id)->assertOk()->assertJsonCount(1, 'data.participants')->assertJsonPath('data.summary.submitted', 1);
    $this->getJson($this->base.'/'.$this->task->id.'?group='.$this->group->id)->assertOk()->assertJsonPath('data.summary.missing', 1);
});

it('reads legacy media and correction history without exposing private paths or changing records', function () {
    $before = $this->sent->fresh()->getAttributes();
    $this->getJson($this->base.'/submissions/'.$this->sent->id)->assertOk()->assertHeader('Cache-Control', 'no-store, private')
        ->assertJsonPath('data.logs.0.feedback', 'Ulangi dengan lebih jelas')->assertJsonPath('data.files.0.index', 0)
        ->assertJsonMissingPath('data.filePath')->assertJsonMissingPath('data.files.0.path')->assertJsonMissingPath('data.student.email');
    $this->get('/api/v1/tanwir/files/submission/'.$this->sent->id)->assertOk();
    expect($this->sent->fresh()->getAttributes())->toBe($before);
    expect(Storage::disk('local')->get('tanwir/submissions/old-private.wav'))->toBe('existing-private-media');
    $this->assertDatabaseCount('tanwir_submissions', 1);
    $this->assertDatabaseCount('tanwir_submission_logs', 1);
});

it('shows zero quiz scores actual selected answers and every question to administrators', function () {
    $this->task->forceFill(['type' => 'quiz'])->save();
    $this->sent->forceFill(['score' => 0, 'status' => 'approved', 'filePath' => null, 'fileMime' => null])->save();
    $q = new TanwirQuizQuestion;
    $q->forceFill(['taskId' => $this->task->id, 'question' => 'Pilih huruf', 'optionA' => 'Alif', 'optionB' => 'Ba', 'correctOption' => 'a', 'order' => 1])->save();
    (new TanwirQuizAnswer)->forceFill(['submissionId' => $this->sent->id, 'questionId' => $q->id, 'selectedOption' => 'b', 'isCorrect' => false])->save();
    $this->getJson($this->base.'/'.$this->task->id)->assertOk()->assertJsonCount(1, 'data.task.questions')->assertJsonPath('data.task.questions.0.correctOption', 'a');
    $this->getJson($this->base.'/submissions/'.$this->sent->id)->assertOk()->assertJsonPath('data.score', 0)->assertJsonPath('data.answers.0.selectedOption', 'b')->assertJsonPath('data.answers.0.isCorrect', false)->assertJsonPath('data.answers.0.question.optionA', 'Alif');
});

it('denies participants PICs other module admins and unauthenticated users', function () {
    $foreign = new User;
    $foreign->forceFill(['name' => 'Other admin', 'email' => 'other-recap@example.test', 'password_hash' => bcrypt('test-only-password'), 'is_active' => true])->save();
    foreach ([$this->student->user, $this->pic->user, $foreign] as $user) {
        foreach (['', '/'.$this->task->id, '/submissions/'.$this->sent->id] as $path) {
            $this->actingAs($user, 'sanctum')->getJson($this->base.$path)->assertForbidden();
        }
    }
    $this->actingAs($this->student->user, 'sanctum')->get('/api/v1/tanwir/files/submission/'.$this->sent->id)->assertOk();
    $this->actingAs($this->otherStudent->user, 'sanctum')->get('/api/v1/tanwir/files/submission/'.$this->sent->id)->assertNotFound();
    auth()->forgetGuards();
    $this->getJson($this->base)->assertUnauthorized();
});

it('validates filters paginates participants and returns genuine missing records as 404', function () {
    $this->getJson($this->base.'/'.$this->task->id.'?per_page=1')->assertOk()->assertJsonCount(1, 'data.participants')->assertJsonPath('data.meta.total', 2);
    $this->getJson($this->base.'/'.$this->task->id.'?per_page=1&page=2')->assertOk()->assertJsonCount(1, 'data.participants')->assertJsonPath('data.meta.current_page', 2);
    foreach (['group=missing', 'page=0', 'per_page=1000', 'status=invalid', 'teacher[]=bad'] as $query) {
        $this->getJson($this->base.'?'.$query)->assertUnprocessable();
    }
    $this->getJson($this->base.'/missing')->assertNotFound();
    $this->getJson($this->base.'/submissions/missing')->assertNotFound();
    DB::table('modules')->where('id', $this->module)->update(['is_active' => false]);
    $this->getJson($this->base)->assertNotFound();
});
