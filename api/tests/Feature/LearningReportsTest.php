<?php

use App\Modules\Core\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

function reportMember(string $module, string $role, ?string $group = null)
{
    $user = new User;
    $user->forceFill(['code' => strtoupper(Str::random(12)), 'name' => $role.' '.Str::random(4), 'email' => Str::uuid().'@example.test', 'password_hash' => Hash::make('password-report-test'), 'is_active' => true, 'is_superadmin' => false])->save();
    $class = 'App\\Modules\\'.ucfirst($module).'\\Models\\'.ucfirst($module).'Member';
    $member = new $class;
    $member->forceFill(['userId' => $user->id, 'code' => $user->code, 'role' => $role, 'groupId' => $group])->save();
    return $member;
}

it('scopes Ojol reports to owned or co-reviewed tasks and paginates safely', function () {
    DB::table('modules')->insert(['id' => (string) Str::uuid(), 'slug' => 'ojol', 'name' => 'Ojol', 'is_active' => true]);
    $teacher = reportMember('ojol', 'guru');
    $reviewer = reportMember('ojol', 'guru');
    $outsider = reportMember('ojol', 'guru');
    $group = new \App\Modules\Ojol\Models\OjolGroup;
    $group->forceFill(['code' => 'OM001', 'name' => 'Bogor'])->save();
    $student = reportMember('ojol', 'peserta', $group->id);
    reportMember('ojol', 'peserta');
    $task = $this->actingAs($teacher->user, 'sanctum')->postJson('/api/v1/ojol/tasks', ['title' => 'Kuis uji', 'description' => 'Jawab', 'type' => 'quiz', 'deadline' => now()->addDay()->timezone('Asia/Jakarta')->format('Y-m-d\TH:i'), 'groupIds' => [$group->id], 'approverIds' => [$reviewer->id], 'questions' => [['question' => 'Pertanyaan?', 'optionA' => 'Ya', 'optionB' => 'Tidak', 'correctOption' => 'a']]])->assertCreated()->json('data.id');
    $question = \App\Modules\Ojol\Models\OjolQuizQuestion::where('task_id', $task)->firstOrFail();
    $this->actingAs($student->user, 'sanctum')->postJson('/api/v1/ojol/tasks/'.$task.'/quiz-attempts', ['answers' => [$question->id => 'a']])->assertCreated();
    $this->getJson('/api/v1/ojol/reports/participants')->assertForbidden();
    $this->actingAs($reviewer->user, 'sanctum')->getJson('/api/v1/ojol/reports/participants?per_page=1')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.assigned', 1)->assertJsonPath('data.0.approved', 1)->assertJsonPath('data.0.score', 100)->assertJsonPath('data.0.completion', 100)->assertJsonPath('summary.score', 100);
    $this->getJson('/api/v1/ojol/reports/participants?engagement=consistent&min_score=90')->assertOk()->assertJsonCount(1, 'data');
    $this->getJson('/api/v1/ojol/reports/participants?type=video')->assertOk()->assertJsonCount(0, 'data');
    $this->actingAs($outsider->user, 'sanctum')->getJson('/api/v1/ojol/reports/participants?teacher='.$teacher->id)->assertOk()->assertJsonCount(0, 'data')->assertJsonCount(0, 'groups');
    $this->actingAs($teacher->user, 'sanctum')->getJson('/api/v1/ojol/reports/participants?per_page=0')->assertUnprocessable();
    $teacher->user->forceFill(['is_active' => false])->save();
    $this->getJson('/api/v1/ojol/reports/participants')->assertUnauthorized();
});
