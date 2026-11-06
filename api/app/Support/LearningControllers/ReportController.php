<?php

namespace App\Support\LearningControllers;

use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReportController extends BaseController
{
    public function index(Request $request)
    {
        $context = $this->context($request);
        abort_unless($context['admin'] || $context['member']?->role === 'guru', 403);
        $input = $request->validate([
            'from' => 'nullable|date_format:Y-m-d', 'to' => 'nullable|date_format:Y-m-d|after_or_equal:from',
            'q' => 'nullable|string|max:200', 'group' => 'nullable|string|max:191', 'teacher' => 'nullable|string|max:191',
            'type' => 'nullable|in:voice_note,video,quiz', 'active' => 'nullable|in:1,0',
            'engagement' => 'nullable|in:consistent,attention,none', 'min_score' => 'nullable|numeric|min:0|max:100',
            'sort' => 'nullable|in:name,-completion,-score,-missing', 'page' => 'sometimes|integer|min:1', 'per_page' => 'sometimes|integer|min:1|max:100',
        ]);
        $module = $this->module($request);
        $teacher = $context['admin'] ? ($input['teacher'] ?? null) : $context['member']->id;
        $tasks = DB::table($module.'_tasks as t');
        if ($teacher) {
            $tasks->where(function ($q) use ($module, $teacher) {
                $q->where('t.teacher_id', $teacher);
                if ($module === 'ojol') {
                    $q->orWhereExists(fn ($a) => $a->selectRaw('1')->from('ojol_task_approvers as a')->whereColumn('a.task_id', 't.id')->where('a.teacher_id', $teacher));
                }
            });
        }
        if (! empty($input['from'])) $tasks->where('t.created_at', '>=', CarbonImmutable::parse($input['from'], 'Asia/Jakarta')->utc());
        if (! empty($input['to'])) $tasks->where('t.created_at', '<', CarbonImmutable::parse($input['to'], 'Asia/Jakarta')->addDay()->utc());
        if (! empty($input['type'])) $tasks->where('t.type', $input['type']);
        // A participant's denominator follows their current group, matching task visibility.
        $eligible = (clone $tasks)->whereExists(fn ($q) => $q->selectRaw('1')->from($module.'_task_groups as tg')->whereColumn('tg.task_id', 't.id')->whereColumn('tg.group_id', 'm.group_id'));
        $submissions = DB::table($module.'_submissions as s')->whereColumn('s.student_id', 'm.id')->whereIn('s.task_id', (clone $eligible)->select('t.id'));
        $members = DB::table($module.'_members as m')->join('users as u', 'u.id', '=', 'm.user_id')->leftJoin($module.'_groups as g', 'g.id', '=', 'm.group_id')->where('m.role', 'peserta');
        if ($teacher) {
            $members->where(function ($q) use ($module, $teacher, $tasks) {
                $q->whereExists(fn ($a) => $a->selectRaw('1')->from($module.'_task_groups as scope_groups')->whereColumn('scope_groups.group_id', 'm.group_id')->whereIn('scope_groups.task_id', (clone $tasks)->select('t.id')));
                if ($module === 'tanwir') $q->orWhere('g.pic_id', $teacher);
            });
        }
        if (! empty($input['group'])) $members->where('m.group_id', $input['group']);
        if (isset($input['active'])) $members->where('u.is_active', (int) $input['active']);
        if (! empty($input['q'])) $members->where(fn ($q) => $q->where('u.name', 'like', '%'.$input['q'].'%')->orWhere('m.code', 'like', '%'.$input['q'].'%'));
        $members->select(['m.id', 'm.code', 'u.name', 'u.is_active as active', 'g.name as group_name', 'g.id as group_id'])
            ->selectSub((clone $eligible)->selectRaw('COUNT(*)'), 'assigned')
            ->selectSub((clone $eligible)->where('t.deadline', '<', now())->selectRaw('COUNT(*)'), 'due')
            ->selectSub((clone $submissions)->selectRaw('COUNT(*)'), 'submitted')
            ->selectSub((clone $submissions)->where('s.status', 'approved')->selectRaw('COUNT(*)'), 'approved')
            ->selectSub((clone $submissions)->where('s.status', 'pending')->selectRaw('COUNT(*)'), 'pending')
            ->selectSub((clone $submissions)->where('s.status', 'rejected')->selectRaw('COUNT(*)'), 'rejected')
            ->selectSub((clone $submissions)->where('s.is_late', false)->selectRaw('COUNT(*)'), 'on_time')
            ->selectSub((clone $submissions)->where('s.is_late', true)->selectRaw('COUNT(*)'), 'late')
            ->selectSub((clone $submissions)->selectRaw('COALESCE(SUM(s.attempts_count),0)'), 'attempts')
            ->selectSub((clone $submissions)->whereNotNull('s.score')->selectRaw('AVG(s.score)'), 'score')
            ->selectSub((clone $submissions)->whereNotNull('s.score')->selectRaw('COUNT(*)'), 'quizzes')
            ->selectSub((clone $submissions)->selectRaw('MAX(s.submitted_at)'), 'last_submission')
            ->selectSub((clone $submissions)->join($module.'_tasks as due_task', 'due_task.id', '=', 's.task_id')->where('due_task.deadline', '<', now())->selectRaw('COUNT(*)'), 'due_submitted');
        $query = DB::query()->fromSub($members, 'r')->select('*')
            ->selectRaw('assigned - submitted as missing, due - due_submitted as overdue, CASE WHEN assigned > 0 THEN ROUND(100.0 * approved / assigned, 1) ELSE NULL END as completion');
        if (isset($input['min_score'])) $query->whereRaw('score >= CAST(? AS DECIMAL(10,2))', [$input['min_score']]);
        if (($input['engagement'] ?? '') === 'none') $query->where('assigned', '>', 0)->where('submitted', 0);
        if (($input['engagement'] ?? '') === 'consistent') $query->where('assigned', '>', 0)->whereRaw('on_time * 1.0 / assigned >= 0.8');
        if (($input['engagement'] ?? '') === 'attention') $query->where('assigned', '>', 0)->whereRaw('on_time * 1.0 / assigned < 0.8');
        $summary = DB::query()->fromSub(clone $query, 'totals')->selectRaw('COUNT(*) as participants, COALESCE(SUM(assigned),0) as assigned, COALESCE(SUM(approved),0) as approved, COALESCE(SUM(pending),0) as pending, COALESCE(SUM(overdue),0) as overdue, COALESCE(SUM(late),0) as late, CASE WHEN SUM(quizzes)>0 THEN SUM(score * quizzes)/SUM(quizzes) ELSE NULL END as score')->first();
        $sorts = ['name' => ['name', 'asc'], '-completion' => ['completion', 'desc'], '-score' => ['score', 'desc'], '-missing' => ['overdue', 'desc']];
        [$column, $direction] = $sorts[$input['sort'] ?? '-completion'];
        $page = $query->orderBy($column, $direction)->orderBy('id')->paginate($request->integer('per_page', 25))->withQueryString();
        $groups = DB::table($module.'_groups')->select('id', 'name', 'code');
        if (! $context['admin']) {
            $groups->whereIn('id', DB::query()->fromSub(clone $members, 'visible')->select('group_id')->whereNotNull('group_id'));
        }
        $teachers = $context['admin'] ? DB::table($module.'_members as m')->join('users as u', 'u.id', '=', 'm.user_id')->where('m.role', 'guru')->orderBy('u.name')->get(['m.id', 'm.code', 'u.name']) : [];
        return (new \App\Http\Resources\LearningReportResource(['data' => $page->items(), 'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total(), 'per_page' => $page->perPage()], 'links' => ['first' => $page->url(1), 'last' => $page->url($page->lastPage()), 'prev' => $page->previousPageUrl(), 'next' => $page->nextPageUrl()], 'summary' => $summary, 'groups' => $groups->orderBy('name')->get(), 'teachers' => $teachers, 'scope' => $context['admin'] ? 'admin' : 'guru']))->response()->header('Cache-Control', 'private, no-store');
    }
}
