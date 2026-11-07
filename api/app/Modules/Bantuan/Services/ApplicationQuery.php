<?php

namespace App\Modules\Bantuan\Services;

use App\Modules\Bantuan\Models\Application;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ApplicationQuery
{
    public function filters(Request $request): array
    {
        return $request->validate([
            'view' => 'nullable|in:ongoing',
            'status' => 'nullable|string|max:50', 'states' => 'nullable|string|max:500',
            'search' => 'nullable|string|max:191', 'program' => 'nullable|string|max:191', 'region' => 'nullable|string|max:191',
            'source' => 'nullable|in:online,walk_in,bypass', 'task' => 'nullable|in:survey,distribution',
            'from' => 'nullable|date_format:Y-m-d', 'to' => ['nullable', 'date_format:Y-m-d', ...($request->filled('from') ? ['after_or_equal:from'] : [])],
            'dateField' => 'nullable|in:created,updated,disbursed,completed',
            'verifierId' => 'nullable|string|max:64', 'distributorId' => 'nullable|string|max:64', 'createdBy' => 'nullable|string|max:64',
            'distributionType' => 'nullable|in:verifier,direct', 'amountState' => 'nullable|in:set,unset',
            'amountMin' => 'nullable|integer|min:0|max:999999999999',
            'amountMax' => ['nullable', 'integer', 'min:0', 'max:999999999999', ...($request->filled('amountMin') ? ['gte:amountMin'] : [])],
            'surveyOverdue' => 'nullable|boolean', 'overdue' => 'nullable|boolean', 'sort' => 'nullable|in:newest,oldest,updated,amount_high,amount_low,name',
            'page' => 'nullable|integer|min:1', 'perPage' => 'nullable|integer|in:12,20,24,48', 'summary' => 'nullable|boolean',
        ]);
    }

    public function build(Request $request, Access $access, array $filters): Builder
    {
        if (($filters['view'] ?? null) === 'ongoing') {
            abort_unless($access->canMonitor($request), 403);
            $query = $access->scope(Application::query(), $request)->whereIn('status', Access::ONGOING);
        } else {
            $query = $access->scope(Application::query(), $request);
        }
        if (! empty($filters['states'])) $query->whereIn('status', explode(',', $filters['states']));
        foreach (['status', 'program', 'region', 'source'] as $field) {
            if (! empty($filters[$field])) $query->where($field, $filters[$field]);
        }
        if (! empty($filters['task'])) $this->task($query, $request, $access, $filters['task']);
        $dateColumn = ['created' => 'created_at', 'updated' => 'updated_at', 'disbursed' => 'disbursed_at', 'completed' => 'completed_at'][$filters['dateField'] ?? 'created'];
        if (! empty($filters['from'])) $query->whereDate($dateColumn, '>=', $filters['from']);
        if (! empty($filters['to'])) $query->whereDate($dateColumn, '<=', $filters['to']);
        foreach (['verifierId' => 'verifier_id', 'distributorId' => 'distributor_id', 'createdBy' => 'created_by'] as $key => $column) {
            if (! empty($filters[$key])) {
                if ($filters[$key] === 'unassigned') $query->whereNull($column);
                else $query->where($column, $filters[$key] === 'me' ? $request->user()->id : $filters[$key]);
            }
        }
        if (! empty($filters['distributionType'])) $query->where('distribution_type', $filters['distributionType']);
        if (($filters['amountState'] ?? '') === 'unset') $query->whereNull('amount');
        if (($filters['amountState'] ?? '') === 'set') $query->whereNotNull('amount');
        if (isset($filters['amountMin'])) $query->where('amount', '>=', $filters['amountMin']);
        if (isset($filters['amountMax'])) $query->where('amount', '<=', $filters['amountMax']);
        if (! empty($filters['surveyOverdue'])) {
            $settings=json_decode(DB::table('bantuan_settings')->where('key','general')->value('value'),true);
            $cutoff=now()->subDays(max(1,(int)($settings['surveyReminderDays']??5)));
            $query->where('status','survey_assigned')->whereNotNull('verifier_id')->whereIn('id',DB::table('bantuan_events')->select('application_id')->whereIn('action',['assign_survey','survey_return','survey_again'])->groupBy('application_id')->havingRaw('MAX(created_at) <= ?',[$cutoff]));
        }
        if (! empty($filters['overdue'])) {
            $settings = json_decode(DB::table('bantuan_settings')->where('key', 'general')->value('value'), true);
            $query->where('status', 'disbursed')->where('disbursed_at', '<', now()->subDays($settings['distributionDays'] ?? 7));
        }
        if (! empty($filters['search'])) {
            $query->where(function (Builder $nested) use ($filters, $access, $request) {
                $nested->where('name', 'like', '%'.$filters['search'].'%')->orWhere('number', 'like', '%'.$filters['search'].'%');
                if ($access->sensitive($request) && preg_match('/^[0-9]{16}$/D', $filters['search'])) {
                    $nested->orWhere(fn ($private) => $access->scopeSensitive($private, $request)->where('nik_hash', app(Intake::class)->nikHash($filters['search'])));
                }
            });
        }
        return $query;
    }

    public function task(Builder $query, Request $request, Access $access, string $task): Builder
    {
        if (! $access->has($request, ['admin'])) {
            if ($task === 'distribution') {
                $query->where(function ($assigned) use ($request, $access) {
                    $assigned->whereRaw('1 = 0');
                    if ($access->has($request, ['verifier'])) $assigned->orWhere('distributor_id', $request->user()->id);
                    if ($access->has($request, ['treasurer'])) $assigned->orWhere('distribution_type', 'direct');
                });
            } elseif ($access->has($request, ['verifier'])) {
                $query->where('verifier_id', $request->user()->id);
            }
        }
        return $query;
    }

    public function ordered(Builder $query, array $filters): Builder
    {
        [$column, $direction] = match ($filters['sort'] ?? 'newest') {
            'oldest' => ['created_at', 'asc'], 'updated' => ['updated_at', 'desc'],
            'amount_high' => ['amount', 'desc'], 'amount_low' => ['amount', 'asc'], 'name' => ['name', 'asc'],
            default => ['created_at', 'desc'],
        };
        if ($column === 'amount') $query->orderByRaw('CASE WHEN amount IS NULL THEN 1 ELSE 0 END');
        return $query->orderBy($column, $direction)->orderBy('id');
    }
}
