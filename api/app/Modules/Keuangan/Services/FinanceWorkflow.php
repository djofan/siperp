<?php

namespace App\Modules\Keuangan\Services;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class FinanceWorkflow
{
    public const APPROVER_ROLES = ['admin', 'finance_admin', 'treasurer', 'approver'];

    public function eligible()
    {
        return DB::table('users')->join('module_access', 'users.id', '=', 'module_access.user_id')
            ->join('modules', 'modules.id', '=', 'module_access.module_id')->where('modules.slug', 'keuangan')
            ->where('users.is_active', true)->whereIn('module_access.role', self::APPROVER_ROLES)
            ->select('users.id', 'users.name')->distinct()->orderBy('users.name')->orderBy('users.id');
    }

    public function write(Request $request, string $operation, array $data, callable $callback): array
    {
        return DB::transaction(function () use ($request, $operation, $data, $callback) {
            $module = DB::table('modules')->where('slug', 'keuangan')->lockForUpdate()->first();
            abort_unless($module && $module->is_active, 403, 'Aktifkan modul Keuangan sebelum menulis data.');
            // Recheck role after the serialization lock, including account/module revocation.
            $actor = DB::table('users')->where('id', $request->user()->id)->lockForUpdate()->first();
            abort_unless($actor && $actor->is_active, 401);
            $role = $actor->is_superadmin ? 'superadmin' : DB::table('module_access')->where('module_id', $module->id)->where('user_id', $actor->id)->lockForUpdate()->value('role');
            abort_unless($role === $request->attributes->get('module_role'), 403, 'Akses berubah. Muat ulang halaman.');
            ksort($data);
            $hash = hash('sha256', json_encode($data, JSON_THROW_ON_ERROR));
            $prior = DB::table('keuangan_requests')->where('actor_id', $actor->id)->where('request_id', $data['requestId'])->first();
            if ($prior) {
                abort_unless($prior->operation === $operation && hash_equals($prior->fingerprint, $hash), 409, 'Kunci permintaan sudah dipakai untuk data berbeda.');

                return json_decode($prior->result, true, 512, JSON_THROW_ON_ERROR);
            }
            $result = $callback();
            DB::table('keuangan_requests')->insert(['id' => (string) Str::uuid(), 'actor_id' => $actor->id, 'request_id' => $data['requestId'], 'operation' => $operation, 'fingerprint' => $hash, 'result' => json_encode($result, JSON_THROW_ON_ERROR), 'created_at' => now()->utc()]);

            return $result;
        }, 3);
    }

    public function assign(object $expense): void
    {
        $rules = DB::table('keuangan_approval_rules')->where('active', true)->where('min_amount', '<=', $expense->amount)->where('max_amount', '>=', $expense->amount)->lockForUpdate()->get();
        abort_if($rules->count() > 1, 409, 'Aturan approval tumpang tindih. Perbaiki pengaturan.');
        if ($rules->isEmpty()) {
            return;
        }
        $rule = $rules->first();
        $ids = DB::table('keuangan_rule_approvers')->where('rule_id', $rule->id)->orderBy('user_id')->pluck('user_id');
        $eligible = $this->eligible()->whereIn('users.id', $ids)->get();
        abort_unless($ids->isNotEmpty() && $eligible->count() === $ids->count(), 422, 'Aturan memiliki approver tidak aktif/tidak berizin. Perbaiki aturan dahulu.');
        $snapshot = json_encode(['ruleId' => $rule->id, 'version' => $rule->version, 'minAmount' => (string) $rule->min_amount, 'maxAmount' => (string) $rule->max_amount, 'approvers' => $eligible->map(fn ($u) => ['id' => $u->id, 'name' => $u->name])->all()], JSON_THROW_ON_ERROR);
        foreach ($ids as $id) {
            $approval = (string) Str::uuid();
            DB::table('keuangan_approvals')->insert(['id' => $approval, 'expense_id' => $expense->id, 'assigned_user_id' => $id, 'revision' => $expense->revision, 'decision' => 'waiting', 'rule_snapshot' => $snapshot, 'version' => 1, 'created_at' => now()->utc(), 'updated_at' => now()->utc()]);
            $this->approvalEvent($approval, null, 'assigned', ['revision' => $expense->revision], null);
        }
    }

    public function approvalEvent(string $id, ?string $actor, string $action, array $changes, ?string $reason): void
    {
        DB::table('keuangan_approval_events')->insert(['id' => (string) Str::uuid(), 'approval_id' => $id, 'actor_id' => $actor, 'action' => $action, 'origin' => 'native', 'changes' => json_encode($changes, JSON_THROW_ON_ERROR), 'reason' => $reason, 'recorded_at' => now()->utc()]);
    }

    public function cancel(object $approval, string $reason, string $actor): void
    {
        DB::table('keuangan_approvals')->where('id', $approval->id)->update(['cancelled_at' => now()->utc(), 'cancel_reason' => $reason, 'version' => $approval->version + 1, 'updated_at' => now()->utc()]);
        $this->approvalEvent($approval->id, $actor, 'closed', ['reason' => $reason], null);
    }

    public function expenseEvent(string $id, string $actor, int $revision, string $action, array $changes, ?string $reason): void
    {
        DB::table('keuangan_expense_events')->insert(['id' => (string) Str::uuid(), 'expense_id' => $id, 'actor_id' => $actor, 'revision' => $revision, 'action' => $action, 'changes' => json_encode($changes, JSON_THROW_ON_ERROR), 'reason' => $reason, 'recorded_at' => now()->utc()]);
    }
}
