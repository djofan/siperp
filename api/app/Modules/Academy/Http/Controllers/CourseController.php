<?php

namespace App\Modules\Academy\Http\Controllers;

use App\Modules\Academy\Models\ZakatAcademyCourse as Course;
use App\Modules\Academy\Models\ZakatAcademyEnrollment as Enrollment;
use App\Modules\Academy\Models\ZakatAcademyQuiz as Quiz;
use App\Modules\Academy\Models\ZakatAcademyQuizAttempt as Attempt;
use App\Modules\Academy\Services\AcademyContext;
use App\Modules\Academy\Services\AcademyDto;
use App\Modules\Academy\Services\ProgressService;
use Illuminate\Http\Request;

class CourseController
{
    public function __construct(private AcademyContext $context, private ProgressService $progress) {}

    private function data($data)
    {
        return response()->json(['data' => $data]);
    }

    public function settings()
    {
        return $this->data($this->context->settings());
    }

    public function intake()
    {
        $course = Course::where('is_published', true)->where('is_simulation', false)->where('registration_open', true)->where(fn ($q) => $q->whereNull('starts_at')->orWhere('starts_at', '>', now()))->withCount('enrollments')->orderBy('order')->orderBy('id')->first();

        return $this->data(['course' => $course ? AcademyDto::make($course) : null, 'filled' => $course ? $course->enrollments_count : 0, 'full' => $course ? $course->enrollments_count >= $course->quota : false]);
    }

    public function index(Request $request)
    {
        $query = Course::where('is_published', true)->select('id', 'title', 'slug', 'short_description', 'thumbnail_url')->with(['chapters' => fn ($q) => $q->where('is_published', true)->select('id', 'course_id')->withCount(['lessons' => fn ($l) => $l->where('is_published', true)])])->orderBy('order')->orderBy('id');
        if ($request->filled('search')) {
            $query->where('title', 'like', '%'.mb_substr($request->input('search'), 0, 100).'%');
        }
        if ($request->filled('take')) {
            $query->take(max(1, min(200, (int) $request->input('take'))));
        }

        return $this->data($query->get()->map(fn ($row) => AcademyDto::make($row)));
    }

    public function show(string $slug)
    {
        $course = Course::where('slug', $slug)->where('is_published', true)->select('id', 'slug', 'title', 'short_description', 'description', 'thumbnail_url', 'teacher', 'starts_at', 'quota', 'duration_days', 'is_simulation')->withCount('enrollments')->with(['chapters' => fn ($q) => $q->where('is_published', true)->select('id', 'course_id', 'title', 'description')->orderBy('order')->orderBy('id'), 'chapters.lessons' => fn ($q) => $q->where('is_published', true)->select('id', 'chapter_id', 'title', 'slug', 'release_day')->orderBy('order')->orderBy('id'), 'chapters.quizzes' => fn ($q) => $q->where('is_published', true)->select('id', 'chapter_id', 'title')])->firstOrFail();

        return $this->data(AcademyDto::make($course));
    }

    public function enrollment(Request $request, string $courseId)
    {
        $profile = $this->context->profile($request);

        return $this->data(Enrollment::where('profile_id', $profile->id)->where('course_id', $courseId)->first());
    }

    public function overview(Request $request)
    {
        $profile = $this->context->profile($request);
        $rows = Enrollment::where('profile_id', $profile->id)->whereHas('course', fn ($q) => $q->where('is_published', true))->with('course')->orderByDesc('created_at')->get();

        return $this->data($rows->map(fn ($row) => ['id' => $row->course->id, 'title' => $row->course->title, 'slug' => $row->course->slug, 'enrolledAt' => $row->createdAt->toISOString()] + $this->progress->forEnrollment($row)));
    }

    public function quizzes(Request $request)
    {
        $profile = $this->context->profile($request);
        $query = Quiz::where('is_published', true)->whereHas('chapter', fn ($q) => $q->where('is_published', true)->whereHas('course', fn ($c) => $c->where('is_published', true)->whereHas('enrollments', fn ($e) => $e->where('profile_id', $profile->id))))->withCount('questions')->with(['chapter:id,course_id,title', 'chapter.course:id,starts_at', 'attempts' => fn ($q) => $q->where('profile_id', $profile->id)->select('id', 'quiz_id', 'attempt_number', 'is_completed', 'score', 'passed')->orderByDesc('attempt_number')])->orderByDesc('quiz_date')->orderBy('id');

        return $this->data($query->get()->map(fn ($row) => AcademyDto::make($row)));
    }

    public function leaderboard()
    {
        $attempts = Attempt::where('is_completed', true)->whereHas('profile.user', fn ($q) => $q->where('is_active', true))->whereHas('quiz', fn ($q) => $q->where('is_published', true)->whereHas('chapter', fn ($c) => $c->where('is_published', true)->whereHas('course', fn ($p) => $p->where('is_published', true))))->select('profile_id', 'quiz_id', 'score')->with('profile:id,user_id', 'profile.user:id,name')->get();
        $people = [];
        foreach ($attempts as $attempt) {
            $id = $attempt->profileId;
            $people[$id]['id'] = $id;
            $people[$id]['name'] = $attempt->profile->user->name;
            $people[$id]['scores'][$attempt->quizId] = max($people[$id]['scores'][$attempt->quizId] ?? 0, $attempt->score ?? 0);
        }
        $rows = array_map(fn ($p) => ['id' => $p['id'], 'name' => $p['name'], 'total' => count($p['scores']), 'average' => array_sum($p['scores']) / count($p['scores'])], array_values($people));
        usort($rows, fn ($a, $b) => $b['average'] <=> $a['average'] ?: $b['total'] <=> $a['total'] ?: strcmp($a['id'], $b['id']));

        return $this->data($rows);
    }

    public function rankings(Request $request)
    {
        $profile = $this->context->profile($request);
        $own = Enrollment::where('profile_id', $profile->id)->whereHas('course', fn ($q) => $q->where('is_published', true))->with('course')->get();
        $rows = [];
        foreach ($own as $enrollment) {
            $quizzes = Quiz::where('is_published', true)->whereHas('chapter', fn ($q) => $q->where('course_id', $enrollment->courseId)->where('is_published', true))->select('id', 'kind')->get()->toArray();
            $attempts = Attempt::where('is_completed', true)->whereIn('quiz_id', array_column($quizzes, 'id'))->select('profile_id', 'quiz_id', 'score')->get()->groupBy('profileId');
            $people = Enrollment::where('course_id', $enrollment->courseId)->whereHas('profile.user', fn ($q) => $q->where('is_active', true))->pluck('profile_id');
            $grades = [];
            foreach ($people as $id) {
                if (isset($attempts[$id])) {
                    $grades[$id] = $this->context->weighted($quizzes, $attempts[$id]->toArray());
                }
            }
            $self = $grades[$profile->id] ?? null;
            $rows[] = ['courseId' => $enrollment->courseId, 'title' => $enrollment->course->title, 'rank' => $self ? 1 + count(array_filter($grades, fn ($g) => $g['score'] > $self['score'])) : null, 'total' => count($grades), 'score' => $self['score'] ?? 0, 'complete' => $self['complete'] ?? false];
        }

        return $this->data($rows);
    }
}
