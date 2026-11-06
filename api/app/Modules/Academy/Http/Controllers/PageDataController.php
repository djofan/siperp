<?php

namespace App\Modules\Academy\Http\Controllers;

use App\Modules\Academy\Models\AcademyCohort as Cohort;
use App\Modules\Academy\Models\AcademyDiscussion as Discussion;
use App\Modules\Academy\Models\AcademyNotificationRead as NotificationRead;
use App\Modules\Academy\Models\AcademyStudyNote as Note;
use App\Modules\Academy\Models\ZakatAcademyChapter as Chapter;
use App\Modules\Academy\Models\ZakatAcademyCompletionRecord as Completion;
use App\Modules\Academy\Models\ZakatAcademyCourse as Course;
use App\Modules\Academy\Models\ZakatAcademyEnrollment as Enrollment;
use App\Modules\Academy\Models\ZakatAcademyLesson as Lesson;
use App\Modules\Academy\Models\ZakatAcademyProfile as Profile;
use App\Modules\Academy\Models\ZakatAcademyQuiz as Quiz;
use App\Modules\Academy\Models\ZakatAcademyQuizAttempt as Attempt;
use App\Modules\Academy\Services\AcademyContext;
use App\Modules\Academy\Services\AcademyDto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PageDataController
{
    public function __construct(private AcademyContext $context) {}

    private function data($data)
    {
        return response()->json(['data' => $data]);
    }

    private function students()
    {
        return Profile::whereNull('deleted_at')->whereHas('user', fn ($q) => $q->where('is_superadmin', false)->whereNotIn('id', DB::table('module_access')->join('modules', 'modules.id', '=', 'module_access.module_id')->where('modules.slug', 'academy')->whereIn('role', ['admin', 'teacher'])->select('user_id')));
    }

    public function intake(Request $request)
    {
        $this->context->admin($request);
        $query = $this->students();
        if ($request->filled('cohort')) {
            $query->whereIn('id', DB::table('academy_cohort_memberships')->where('cohort_id', $request->input('cohort'))->select('profile_id'));
        }
        if (in_array($request->input('group'), ['IKHWAN', 'AKHWAT'], true)) {
            $query->where('gender', $request->input('group'));
        }
        if ($request->filled('q')) {
            $q = '%'.mb_substr($request->input('q'), 0, 100).'%';
            $query->where(fn ($b) => $b->where('nis', 'like', $q)->orWhere('phone', 'like', $q)->orWhereHas('user', fn ($u) => $u->where('name', 'like', $q)));
        }
        $page = max(1, min(100000, (int) $request->input('page', 1)));
        $total = (clone $query)->count();
        $people = $query->with('cohort:id,title', 'user:id,name,is_active', 'enrollments.course:id,title')
            ->orderBy('nis')
            ->orderBy(DB::table('users')->select('name')->whereColumn('users.id', 'zakat_academy_profiles.user_id')->limit(1))
            ->orderBy('id')->skip(($page - 1) * 25)->take(25)->get()->map(function ($row) {
            $data = $row->toArray();
            $data['user'] = ['name' => $row->user->name, 'isActive' => (bool) $row->user->is_active];

            return $data;
        });
        $counts = $this->students()->select('gender')->selectRaw('COUNT(*) AS total')->groupBy('gender')->get()->map(fn ($row) => ['gender' => $row->gender, '_count' => ['_all' => (int) $row->total]]);

        return $this->data(['people' => $people, 'total' => $total, 'counts' => $counts, 'cohorts' => Cohort::withCount('participants')->orderByDesc('created_at')->get(), 'courses' => Course::withCount('enrollments')->orderBy('order')->get()->map(fn ($row) => AcademyDto::make($row))]);
    }

    public function person(Request $request, string $id)
    {
        $this->context->admin($request);

        return $this->data($this->students()->with('user:id,name', 'cohort:id,title')->findOrFail($id));
    }

    public function cohorts(Request $request)
    {
        $this->context->admin($request);

        return $this->data(Cohort::withCount('participants')->orderByDesc('created_at')->orderBy('id')->get());
    }

    public function material(Request $request, string $courseId)
    {
        $profile = $this->context->profile($request);
        Enrollment::where('profile_id', $profile->id)->where('course_id', $courseId)->firstOrFail();

        return $this->data(Course::where('id', $courseId)->where('is_published', true)->firstOrFail(['material_url']));
    }

    public function lesson(Request $request, string $courseSlug, string $lessonSlug)
    {
        $profile = $this->context->profile($request);
        $row = Lesson::where('slug', $lessonSlug)->where('is_published', true)->whereHas('chapter', fn ($q) => $q->where('is_published', true)->whereHas('course', fn ($c) => $c->where('slug', $courseSlug)->where('is_published', true)->whereHas('enrollments', fn ($e) => $e->where('profile_id', $profile->id))))->with('chapter.course')->firstOrFail();
        if (! $this->context->released($row->chapter->course->startsAt, $row->releaseDay)) {
            return $this->data(['lesson' => ['id' => $row->id, 'title' => $row->title, 'releaseDay' => $row->releaseDay, 'contentSummary' => null, 'videoProvider' => 'AUDIO', 'videoUrl' => '', 'attachments' => [], 'lessonProgress' => []], 'note' => null]);
        }
        $row->load(['attachments:id,lesson_id,title,file_url', 'lessonProgress' => fn ($q) => $q->where('profile_id', $profile->id)->select('id', 'lesson_id', 'completed', 'audio_position', 'audio_source')]);
        $data = $row->toArray();
        unset($data['chapter']);

        return $this->data(['lesson' => $data, 'note' => Note::where('profile_id', $profile->id)->where('lesson_id', $row->id)->first(['content'])]);
    }

    public function notes(Request $request)
    {
        $profile = $this->context->profile($request);

        return $this->data(Note::where('profile_id', $profile->id)->whereHas('lesson', fn ($q) => $q->where('is_published', true)->whereHas('chapter', fn ($c) => $c->where('is_published', true)->whereHas('course', fn ($p) => $p->where('is_published', true)->whereHas('enrollments', fn ($e) => $e->where('profile_id', $profile->id)))))->with('lesson:id,chapter_id,title,slug', 'lesson.chapter:id,course_id', 'lesson.chapter.course:id,title,slug')->orderByDesc('updated_at')->take(100)->get());
    }

    public function discussions(Request $request)
    {
        $profile = $this->context->profile($request);
        $enrollments = Enrollment::where('profile_id', $profile->id)->whereHas('course', fn ($q) => $q->where('is_published', true))->with(['course:id,title', 'course.sessions' => fn ($q) => $q->orderBy('starts_at')])->get();

        return $this->data(['enrollments' => $enrollments, 'questions' => Discussion::where('profile_id', $profile->id)->whereIn('course_id', $enrollments->pluck('courseId'))->orderByDesc('created_at')->take(100)->get()]);
    }

    public function certificates(Request $request)
    {
        $profile = $this->context->profile($request);

        return $this->data(Completion::where('profile_id', $profile->id)->select('course_id', 'certificate_url')->get());
    }

    public function teacherStats(Request $request)
    {
        $this->context->teacher($request);

        return $this->data(['materials' => Lesson::count(), 'exams' => Quiz::count(), 'questions' => Discussion::whereNull('answer')->count(), 'participants' => Profile::whereHas('enrollments')->whereHas('user', fn ($q) => $q->where('is_active', true))->count()]);
    }

    public function teacherMaterials(Request $request)
    {
        $this->context->teacher($request);

        return $this->data(Chapter::with('course:id,title', 'lessons')->orderBy('order')->get());
    }

    public function teacherQuizzes(Request $request)
    {
        $this->context->teacher($request);

        return $this->data(Chapter::with(['course:id,title', 'quizzes' => fn ($q) => $q->withCount('questions')->orderBy('release_day')])->orderBy('order')->get()->map(fn ($row) => AcademyDto::make($row)));
    }

    public function teacherQuiz(Request $request, string $id)
    {
        $this->context->teacher($request);
        $quiz = Quiz::with('chapter')->with(['questions' => fn ($q) => $q->orderBy('order')->orderBy('id'), 'questions.options'])->withCount('attempts')->findOrFail($id);

        return $this->data(['scope' => ['chapterId' => $quiz->chapterId, 'chapter' => ['courseId' => $quiz->chapter->courseId]], 'quiz' => AcademyDto::make($quiz)]);
    }

    public function teacherQuestions(Request $request)
    {
        $this->context->teacher($request);

        return $this->data(Discussion::select('id', 'question', 'answer', 'profile_id', 'course_id')->with('profile:id,user_id', 'profile.user:id,name', 'course:id,title')->orderBy('answered_at')->orderByDesc('created_at')->take(100)->get());
    }

    public function teacherGrades(Request $request)
    {
        $this->context->teacher($request);
        $courses = Course::with(['chapters:id,course_id', 'chapters.quizzes' => fn ($q) => $q->where('is_published', true)->select('id', 'chapter_id', 'kind', 'title')])->get();
        $enrollments = Enrollment::with('profile:id,user_id,nis', 'profile.user:id,name')->orderBy('created_at')->get()->groupBy('courseId');
        $attempts = Attempt::where('is_completed', true)->select('profile_id', 'quiz_id', 'score')->get()->groupBy('profileId');
        $rows = $courses->map(function ($course) use ($enrollments, $attempts) {
            $quizzes = $course->chapters->flatMap->quizzes->values();
            $people = ($enrollments[$course->id] ?? collect())->map(function ($enrollment) use ($quizzes, $attempts) {
                $values = ($attempts[$enrollment->profileId] ?? collect())->map(fn ($attempt) => ['quizId' => $attempt->quizId, 'score' => (float) ($attempt->score ?? 0)])->all();

                return ['profileId' => $enrollment->profileId, 'name' => $enrollment->profile->user->name, 'nis' => $enrollment->profile->nis, 'grade' => $this->context->weighted($quizzes->toArray(), $values)];
            })->values();

            return ['id' => $course->id, 'title' => $course->title, 'quizzes' => $quizzes->map->only(['id', 'title'])->values(), 'people' => $people];
        })->values();

        return $this->data(['courses' => $rows]);
    }

    public function support(Request $request)
    {
        $this->context->teacher($request);
        $enrollments = Enrollment::whereHas('profile.user', fn ($q) => $q->where('is_active', true))->whereHas('course', fn ($q) => $q->where('is_published', true))->with('course:id,title,starts_at', 'profile:id,user_id', 'profile.user:id,name')->get();
        $quizzes = Quiz::where('is_published', true)->where('is_active', true)->whereHas('chapter', fn ($q) => $q->where('is_published', true)->whereHas('course', fn ($c) => $c->where('is_published', true)))->with('chapter:id,course_id')->get();
        $best = Attempt::where('is_completed', true)->select('profile_id', 'quiz_id')->selectRaw('MAX(score) AS score')->groupBy('profile_id', 'quiz_id')->get()->keyBy(fn ($a) => $a->profileId.':'.$a->quizId);
        $people = [];
        foreach ($enrollments as $person) {
            $pending = 0;
            $missed = 0;
            $low = 0;
            foreach ($quizzes as $quiz) {
                if ($quiz->chapter->courseId !== $person->courseId || ! $person->course->startsAt) {
                    continue;
                }
                $start = $person->course->startsAt;
                $release = $start->setTimezone('Asia/Jakarta')->startOfDay()->addDays($quiz->releaseDay - 1)->utc();
                $opens = max($start, $release, $quiz->quizDate ?? $release);
                if ($opens->isFuture()) {
                    continue;
                }
                $score = $best[$person->profileId.':'.$quiz->id]->score ?? null;
                if ($score === null) {
                    if ($quiz->closesAt && ! $quiz->closesAt->isFuture()) {
                        $missed++;
                    } else {
                        $pending++;
                    }
                } elseif ($score < $quiz->passingScore) {
                    $low++;
                }
            } if ($pending || $missed || $low) {
                $people[] = $person->toArray() + compact('pending', 'missed', 'low');
            }
        }
        usort($people, fn ($a, $b) => $b['missed'] <=> $a['missed'] ?: $b['low'] <=> $a['low'] ?: $b['pending'] <=> $a['pending']);

        return $this->data($people);
    }

    public function notifications(Request $request)
    {
        $profile = $this->context->profile($request);
        $reads = NotificationRead::where('profile_id', $profile->id)->pluck('key')->all();
        $quizzes = Quiz::where('is_published', true)->where('is_active', true)->whereHas('chapter', fn ($q) => $q->where('is_published', true)->whereHas('course', fn ($c) => $c->where('is_published', true)->whereHas('enrollments', fn ($e) => $e->where('profile_id', $profile->id))))->with(['chapter.course', 'attempts' => fn ($q) => $q->where('profile_id', $profile->id)->where('is_completed', true)->select('id', 'quiz_id')])->get();
        $rows = [];
        foreach ($quizzes as $quiz) {
            $start = $quiz->chapter->course->startsAt;
            if (! $start || $quiz->attempts->count()) {
                continue;
            }
            $release = $start->setTimezone('Asia/Jakarta')->startOfDay()->addDays($quiz->releaseDay - 1)->utc();
            $opens = max($start, $release, $quiz->quizDate ?? $release);
            $state = $quiz->closesAt && ! $quiz->closesAt->isFuture() ? 'missed' : ($opens->isFuture() ? ($opens->diffInDays(now(), true) <= 7 ? 'upcoming' : null) : ($quiz->closesAt && $quiz->closesAt->diffInHours(now(), true) <= 24 ? 'due' : 'open'));
            if (! $state || $state === 'missed' && $quiz->closesAt->diffInDays(now(), true) > 7) {
                continue;
            }
            $key = $quiz->id.':'.$state.':'.$opens->getTimestampMs().':'.($quiz->closesAt?->getTimestampMs() ?? 0);
            $rows[] = ['key' => $key, 'quizId' => $quiz->id, 'title' => $quiz->title, 'course' => $quiz->chapter->course->title, 'opensAt' => $opens->toISOString(), 'closesAt' => $quiz->closesAt?->toISOString(), 'state' => $state, 'read' => in_array($key, $reads, true)];
        }
        usort($rows, fn ($a, $b) => $a['read'] <=> $b['read'] ?: strcmp($a['closesAt'] ?? $a['opensAt'], $b['closesAt'] ?? $b['opensAt']));

        return $this->data($rows);
    }
}
