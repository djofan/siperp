<?php

namespace App\Modules\Academy\Http\Controllers;

use App\Modules\Academy\Models\AcademyCohort;
use App\Modules\Academy\Models\ZakatAcademyProfile as Profile;
use App\Modules\Academy\Models\ZakatAcademyQuiz as Quiz;
use App\Modules\Academy\Models\ZakatAcademyQuizAttempt as Attempt;
use App\Modules\Academy\Services\AcademyContext;
use App\Modules\Academy\Services\AcademyTimetable;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminProgressController
{
    public function __construct(private AcademyContext $context, private AcademyTimetable $timetable) {}

    private function data(array $value)
    {
        return response()->json(['data' => $value])->header('Cache-Control', 'no-store, private');
    }

    private function profiles(string $cohort)
    {
        return Profile::whereNull('deleted_at')->whereHas('user', fn ($u) => $u->where('is_superadmin', false)->whereNotIn('id', DB::table('module_access')->join('modules', 'modules.id', '=', 'module_access.module_id')->where('modules.slug', 'academy')->whereIn('role', ['admin', 'teacher'])->select('user_id')))->where(function ($query) use ($cohort) {
            $query->where('cohort_id', $cohort)->orWhereExists(fn ($m) => $m->selectRaw('1')->from('academy_cohort_memberships')->whereColumn('profile_id', 'zakat_academy_profiles.id')->where('cohort_id', $cohort));
        });
    }

    private function quizzes(string $cohort)
    {
        return Quiz::where('is_published', true)->whereHas('chapter', fn ($q) => $q->where('is_published', true)->whereHas('course', fn ($c) => $c->where('cohort_id', $cohort)->where('is_published', true)))
            ->with('chapter.course')->orderBy('created_at')->orderBy('id')->get();
    }

    private function person($profile): array
    {
        return ['id' => $profile->id, 'name' => $profile->user->name, 'nis' => $profile->nis, 'gender' => $profile->gender, 'active' => $profile->user->is_active];
    }

    private function summary($quizzes, array $attempts, array $weights): array
    {
        $grade = $this->context->weighted($quizzes->map(fn ($q) => ['id' => $q->id, 'kind' => $q->kind])->all(), $attempts, $weights);
        $completed = count(array_unique(array_column($attempts, 'quizId')));
        $scores = array_filter(array_column($attempts, 'score'), fn ($score) => $score !== null);

        return ['completedQuizzes' => $completed, 'totalQuizzes' => $quizzes->count(), 'allCompleted' => $quizzes->isNotEmpty() && $completed === $quizzes->count(),
            'score' => $grade['score'], 'predicate' => $grade['predicate'], 'finalCompleted' => $grade['finalCompleted'],
            'averageScore' => count($scores) ? round(array_sum($scores) / count($scores), 2) : null];
    }

    public function index(Request $request)
    {
        $this->context->admin($request);
        $input = $request->validate(['cohort' => 'sometimes|nullable|string|max:191', 'q' => 'sometimes|nullable|string|max:100', 'group' => 'sometimes|nullable|in:IKHWAN,AKHWAT', 'page' => 'sometimes|integer|min:1|max:100000']);
        $cohorts = AcademyCohort::orderByDesc('created_at')->orderBy('id')->get(['id', 'title']);
        $cohort = $cohorts->firstWhere('id', ! empty($input['cohort']) ? $input['cohort'] : $cohorts->first()?->id);
        abort_if(! $cohort && ! empty($input['cohort']), 404);
        $empty = ['cohorts' => $cohorts->map->only(['id', 'title'])->values(), 'cohort' => null, 'items' => [], 'total' => 0, 'page' => 1, 'pages' => 1, 'totalQuizzes' => 0, 'fullyCompletedParticipants' => 0];
        if (! $cohort) {
            return $this->data($empty);
        }
        $quizzes = $this->quizzes($cohort->id);
        $query = $this->profiles($cohort->id);
        if (! empty($input['q'])) {
            $query->where(fn ($q) => $q->where('nis', 'like', '%'.$input['q'].'%')->orWhereHas('user', fn ($u) => $u->where('name', 'like', '%'.$input['q'].'%')));
        }
        if (! empty($input['group'])) {
            $query->where('gender', $input['group']);
        }
        $total = (clone $query)->count();
        $pages = max(1, (int) ceil($total / 25));
        $page = min($pages, (int) ($input['page'] ?? 1));
        $completedIds = DB::table('zakat_academy_quiz_attempts')->where('is_completed', true)->whereIn('quiz_id', $quizzes->pluck('id'))->select('profile_id')->groupBy('profile_id')->havingRaw('COUNT(DISTINCT quiz_id) = ?', [$quizzes->count()]);
        $fullyCompleted = $quizzes->isEmpty() ? 0 : (clone $query)->whereIn('id', $completedIds)->count();
        $people = $query->with('user:id,name,is_active')->orderBy('nis')->orderBy('id')->skip(($page - 1) * 25)->take(25)->get(['id', 'user_id', 'nis', 'gender']);
        // Never load answer snapshots/keys in the participant directory.
        $best = DB::table('zakat_academy_quiz_attempts')->whereIn('profile_id', $people->pluck('id'))->whereIn('quiz_id', $quizzes->pluck('id'))->where('is_completed', true)
            ->select('profile_id', 'quiz_id')->selectRaw('MAX(score) AS score')->groupBy('profile_id', 'quiz_id')->get()->groupBy('profile_id');
        $weights = $this->context->settings()['weights'];
        $items = $people->map(fn ($p) => [...$this->person($p), ...$this->summary($quizzes, ($best[$p->id] ?? collect())->map(fn ($a) => ['quizId' => $a->quiz_id, 'score' => $a->score === null ? null : (float) $a->score])->all(), $weights)]);

        return $this->data([...$empty, 'cohort' => ['id' => $cohort->id, 'title' => $cohort->title], 'items' => $items, 'total' => $total, 'page' => $page, 'pages' => $pages, 'totalQuizzes' => $quizzes->count(), 'fullyCompletedParticipants' => $fullyCompleted]);
    }

    public function show(Request $request, string $profileId)
    {
        $this->context->admin($request);
        $input = $request->validate(['cohort' => 'required|string|max:191']);
        $cohort = AcademyCohort::findOrFail($input['cohort']);
        $person = $this->profiles($cohort->id)->with('user:id,name,is_active')->findOrFail($profileId);
        $quizzes = $this->quizzes($cohort->id);
        $attempts = Attempt::where('profile_id', $person->id)->whereIn('quiz_id', $quizzes->pluck('id'))->orderByDesc('attempt_number')
            ->get(['id', 'quiz_id', 'is_completed', 'score', 'started_at', 'submitted_at', 'attempt_number', 'answers'])->groupBy('quizId');
        $values = [];
        $now = CarbonImmutable::now();
        $numbers = [];
        $rows = $quizzes->map(function ($quiz) use ($attempts, &$values, $now, &$numbers) {
            $number = $numbers[$quiz->kind] = ($numbers[$quiz->kind] ?? 0) + 1;
            $own = $attempts[$quiz->id] ?? collect();
            $completed = $own->where('isCompleted', true)->sortByDesc(fn ($attempt) => $attempt->score ?? -1)->first();
            $latest = $own->first();
            $opensAt = $this->timetable->examOpening($quiz);
            $deadline = null;
            if ($latest && ! $latest->isCompleted) {
                $snapshot = $latest->answers;
                $deadline = $latest->startedAt->addMinutes($snapshot['timeLimitMinutes'] ?? $quiz->timeLimitMinutes);
                if (! empty($snapshot['closesAt'])) {
                    $deadline = min($deadline, CarbonImmutable::parse($snapshot['closesAt']));
                }
            }
            if ($completed) {
                $status = 'completed';
                $values[] = ['quizId' => $quiz->id, 'score' => $completed->score];
            } elseif ($deadline && $deadline <= $now) {
                $status = 'expired';
            } elseif ($quiz->closesAt && $quiz->closesAt <= $now) {
                $status = $latest ? 'expired' : 'missed';
            } elseif (! $quiz->isActive) {
                $status = 'inactive';
            } elseif (! $opensAt || $opensAt > $now) {
                $status = 'upcoming';
            } elseif ($latest) {
                $status = 'in_progress';
            } else {
                $status = 'not_started';
            }

            // Project explicit metadata only. No answers, options, notes or password fields.
            return ['id' => $quiz->id, 'title' => $quiz->title, 'kind' => $quiz->kind, 'number' => $number, 'status' => $status,
                'score' => $completed?->score, 'startedAt' => ($completed ?? $latest)?->startedAt?->toISOString(), 'submittedAt' => $completed?->submittedAt?->toISOString(),
                'opensAt' => $opensAt?->toISOString(), 'closesAt' => $quiz->closesAt?->toISOString(), 'timeLimitMinutes' => $quiz->timeLimitMinutes];
        });

        return $this->data(['cohort' => ['id' => $cohort->id, 'title' => $cohort->title], 'person' => $this->person($person),
            'summary' => $this->summary($quizzes, $values, $this->context->settings()['weights']), 'quizzes' => $rows]);
    }
}
