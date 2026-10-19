<?php

namespace App\Modules\Academy\Http\Controllers;

use App\Modules\Academy\Models\ZakatAcademyCompletionRecord as Completion;
use App\Modules\Academy\Models\ZakatAcademyEnrollment as Enrollment;
use App\Modules\Academy\Models\ZakatAcademyLesson as Lesson;
use App\Modules\Academy\Models\ZakatAcademyQuiz as Quiz;
use App\Modules\Academy\Models\ZakatAcademyQuizAttempt as Attempt;
use App\Modules\Academy\Models\ZakatAcademySetting as Setting;
use App\Modules\Academy\Services\AcademyContext;
use App\Modules\Academy\Services\AcademyDto;
use App\Modules\Academy\Services\ProgressService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ParticipantController
{
    public function __construct(private AcademyContext $context, private ProgressService $progress) {}

    private function data($value)
    {
        return response()->json(['data' => $value]);
    }

    private function relations($query)
    {
        return $query->with(['profile:id,user_id,nis', 'profile.user:id,name,email,is_active', 'course:id,title,is_published']);
    }

    private function dto($row): array
    {
        $data = $row->toArray();
        $data['profile']['user'] = ['name' => $row->profile->user->name, 'email' => $row->profile->user->email, 'isActive' => (bool) $row->profile->user->is_active];

        return $data;
    }

    private function filters($query, Request $request)
    {
        if ($request->filled('search')) {
            $search = '%'.mb_substr($request->input('search'), 0, 100).'%';
            $query->whereHas('profile', fn ($q) => $q->where(fn ($p) => $p->where('nis', 'like', $search)->orWhereHas('user', fn ($u) => $u->where('name', 'like', $search)->orWhere('email', 'like', $search))));
        }
        if ($request->filled('program')) {
            $query->whereHas('course', fn ($q) => $q->where('title', 'like', '%'.mb_substr($request->input('program'), 0, 100).'%'));
        }

        return $query;
    }

    private function enrollment($row): array
    {
        $data = $this->dto($row) + $this->progress->forEnrollment($row);
        unset($data['grading']);
        if (! $data['isEligible']) {
            $data['completedAt'] = null;
        }

return $data;
    }

    private function current($record): ?array
    {
        $enrollment = $this->relations(Enrollment::where('profile_id', $record->profileId)->where('course_id', $record->courseId))->first();

        return $enrollment ? $this->enrollment($enrollment) : null;
    }

    public function enrollments(Request $request)
    {
        $this->context->admin($request);
        $query = $this->relations($this->filters(Enrollment::query(), $request))->orderByDesc('created_at')->orderBy('id');
        $total = (clone $query)->count();
        $pages = max(1, (int) ceil($total / 20));
        $page = min(max(1, (int) $request->input('page', 1)), $pages);

        return $this->data(['items' => $query->skip(($page - 1) * 20)->take(20)->get()->map(fn ($row) => $this->enrollment($row)), 'total' => $total, 'page' => $page, 'pages' => $pages]);
    }

    public function enrollmentDetail(Request $request, string $id)
    {
        $this->context->admin($request);
        $row = $this->relations(Enrollment::query())->findOrFail($id);
        $lessons = Lesson::where('is_published', true)->whereHas('chapter', fn ($q) => $q->where('course_id', $row->courseId)->where('is_published', true))->select('id', 'title', 'chapter_id')->with(['chapter:id,title', 'lessonProgress' => fn ($q) => $q->where('profile_id', $row->profileId)->select('id', 'lesson_id', 'completed', 'completed_at')])->orderBy('chapter_id')->orderBy('order')->orderBy('id');
        $quizzes = Quiz::where('is_published', true)->whereHas('chapter', fn ($q) => $q->where('course_id', $row->courseId)->where('is_published', true))->select('id', 'title', 'chapter_id')->with('chapter:id,title')->orderBy('chapter_id')->orderBy('id');
        $lessonPage = AcademyDto::page($lessons, (int) $request->input('lessonPage', 1));
        $quizPage = AcademyDto::page($quizzes, (int) $request->input('quizPage', 1));
        $ids = collect($quizPage['items'])->pluck('id');
        $attempts = Attempt::where('profile_id', $row->profileId)->where('is_completed', true)->whereIn('quiz_id', $ids)->select('quiz_id', 'score', 'passed')->get()->groupBy('quizId');
        $quizPage['items'] = collect($quizPage['items'])->map(function ($quiz) use ($attempts) {
            $values = $attempts[$quiz['id']] ?? collect();

            return $quiz + ['bestScore' => $values->count() ? $values->max('score') : null, 'passed' => $values->contains('passed', true), 'completedAttempts' => $values->count()];
        });
        $record = Completion::where('profile_id', $row->profileId)->where('course_id', $row->courseId)->select('id', 'is_eligible', 'completed_at', 'certificate_url')->first();

        return $this->data($this->enrollment($row) + ['record' => $record, 'lessons' => $lessonPage, 'quizzes' => $quizPage]);
    }

    public function completions(Request $request)
    {
        $this->context->admin($request);
        $query = $this->relations($this->filters(Completion::query(), $request))->orderByDesc('updated_at')->orderBy('id');
        $total = (clone $query)->count();
        $pages = max(1, (int) ceil($total / 20));
        $page = min(max(1, (int) $request->input('page', 1)), $pages);

        return $this->data(['items' => $query->skip(($page - 1) * 20)->take(20)->get()->map(fn ($row) => $this->dto($row) + ['current' => $this->current($row)]), 'total' => $total, 'page' => $page, 'pages' => $pages]);
    }

    public function completion(Request $request, string $id)
    {
        $this->context->admin($request);
        $row = $this->relations(Completion::query())->findOrFail($id);

        return $this->data($this->dto($row) + ['current' => $this->current($row)]);
    }

    public function sync(Request $request, string $id)
    {
        $this->context->admin($request);
        $result = DB::transaction(function () use ($id) {
            $enrollment = $this->relations(Enrollment::where('id', $id)->lockForUpdate())->firstOrFail();
            $progress = $this->progress->forEnrollment($enrollment);
            $record = Completion::where('profile_id', $enrollment->profileId)->where('course_id', $enrollment->courseId)->first() ?? new Completion;
            $record->profileId = $enrollment->profileId;
            $record->courseId = $enrollment->courseId;
            $record->isEligible = $progress['isEligible'] && $progress['completedAt'];
            $record->completedAt = $progress['completedAt'];
            $record->save();

            return ['id' => $record->id];
        }, 3);

        return $this->data($result);
    }

    public function certificate(Request $request, string $id)
    {
        $this->context->admin($request);
        $data = $request->validate(['certificateUrl' => 'nullable|string|max:2048']);
        $url = $data['certificateUrl'] ?? null;
        abort_unless($this->context->safeUrl($url), 422, 'URL sertifikat tidak valid.');
        DB::transaction(function () use ($id, $url) {
            $record = Completion::where('id', $id)->lockForUpdate()->firstOrFail();
            $current = $this->current($record);
            abort_if($url && (! $current || ! $current['isEligible'] || ! $current['profile']['user']['isActive']), 422, 'Peserta harus aktif dan memenuhi syarat kelulusan.');
            $record->isEligible = $current['isEligible'] ?? false;
            $record->completedAt = $current['completedAt'] ?? null;
            $record->certificateUrl = $url ?: null;
            $record->save();
        }, 3);

        return $this->data(true);
    }

    public function destroy(Request $request, string $id)
    {
        $this->context->admin($request);
        Completion::findOrFail($id)->delete();

        return $this->data(true);
    }

    public function settings(Request $request)
    {
        $this->context->admin($request);
        $module = DB::table('modules')->where('slug', 'academy')->first();

        return $this->data(['maintenance' => Setting::where('key', 'maintenance_mode')->value('value') === 'true', 'registered' => (bool) $module, 'active' => (bool) ($module?->is_active ?? false)]);
    }

    public function maintenance(Request $request)
    {
        $this->context->admin($request);
        $value = in_array($request->input('maintenance'), ['on', true, '1', 1], true) ? 'true' : 'false';
        $row = Setting::where('key', 'maintenance_mode')->first() ?? new Setting;
        $row->key = 'maintenance_mode';
        $row->value = $value;
        $row->save();

        return $this->data(true);
    }
}
