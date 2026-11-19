<?php

namespace App\Modules\Keuangan\Http\Controllers;

use App\Modules\Keuangan\Services\FinanceWorkflow;
use App\Modules\Keuangan\Services\KeuanganAccess;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class WorkflowController
{
    public function __construct(private KeuanganAccess $access, private FinanceWorkflow $workflow) {}

    private function data(mixed $value, int $status = 200)
    {
        return response()->json(['data' => $value], $status)->header('Cache-Control', 'no-store, private');
    }

    private function permission(Request $r, string $capability): array
    {
        $context = $this->access->context($r);
        abort_unless($context[$capability], 403, 'Tidak diizinkan.');

        return $context;
    }

    private function input(Request $r, array $rules): array
    {
        abort_if(array_diff(array_keys($r->all()), array_keys($rules)), 422, 'Field tidak dikenal.');

        return $r->validate($rules);
    }

    private function moneyRule(): string
    {
        // Exact whole rupiah, bounded below PHP/JS integer limits; output remains text.
        return 'required|string|regex:/^[1-9][0-9]{0,15}$/|numeric|max:9000000000000000';
    }

    private function page($query, Request $r): array
    {
        $input = $r->validate(['page' => 'sometimes|integer|min:1|max:100000']);
        $total = (clone $query)->count();
        $pages = max(1, (int) ceil($total / 25));
        $page = min($pages, (int) ($input['page'] ?? 1));

        return ['rows' => $query->skip(($page - 1) * 25)->take(25)->get(), 'page' => $page, 'pages' => $pages, 'total' => $total];
    }

    private function expenseRow(object $e): array
    {
        $q = DB::table('keuangan_approvals')->where('expense_id', $e->id)->where('revision', $e->revision)->where(fn ($active) => $active->whereNull('cancel_reason')->orWhere('cancel_reason', '!=', 'role_retired'));
        $count = (clone $q)->count();
        $status = $count === 0 ? 'unassigned' : ((clone $q)->where('decision', 'rejected')->exists() ? 'rejected' : ((clone $q)->where('decision', '!=', 'approved')->exists() ? 'waiting' : 'approved'));

        return ['id' => $e->id, 'recipient' => $e->recipient, 'description' => $e->description, 'amount' => (string) $e->amount, 'sourceId' => $e->source_id, 'categoryId' => $e->category_id,
            'programId' => $e->program_id, 'program' => $e->program_id ? DB::table('keuangan_programs')->where('id', $e->program_id)->value('name') : null, 'requestedOn' => $e->requested_on, 'recipientIdentity' => $e->recipient_identity, 'treasurerId' => $e->treasurer_id, 'treasurer' => $e->treasurer_id ? DB::table('users')->where('id', $e->treasurer_id)->value('name') : null, 'createdBy' => $e->created_by ? DB::table('users')->where('id', $e->created_by)->value('name') : null,
            'source' => $e->source_name ?? DB::table('keuangan_sources')->where('id', $e->source_id)->value('name'),
            'category' => $e->category_name ?? DB::table('keuangan_categories')->where('id', $e->category_id)->value('name'),
            'version' => $e->version, 'revision' => $e->revision, 'origin' => $e->origin, 'createdAt' => $e->created_at ? CarbonImmutable::parse($e->created_at, 'UTC')->toISOString() : null, 'status' => $status];
    }

    public function expenses(Request $r)
    {
        $this->access->context($r);
        $filters = $r->validate(['search' => 'sometimes|nullable|string|max:100', 'source' => 'sometimes|nullable|string|max:191', 'category' => 'sometimes|nullable|string|max:191']);
        $q = DB::table('keuangan_expenses')->whereNull('archived_at')->orderByDesc('created_at')->orderByDesc('id');
        if (! empty($filters['search'])) {
            $q->where(fn ($s) => $s->where('recipient', 'like', '%'.$filters['search'].'%')->orWhere('description', 'like', '%'.$filters['search'].'%'));
        }
        foreach (['source', 'category'] as $key) {
            if (! empty($filters[$key])) {
                $q->where($key.'_id', $filters[$key]);
            }
        }
        $page = $this->page($q, $r);

        return $this->data(['items' => $page['rows']->map(fn ($e) => $this->expenseRow($e)), ...array_diff_key($page, ['rows' => true])]);
    }

    public function expense(Request $r, string $id)
    {
        $context = $this->access->context($r);
        $expense = DB::table('keuangan_expenses')->where('id', $id)->first();
        abort_unless($expense, 404);
        $result = $this->expenseRow($expense);
        $result['signoffs'] = DB::table('keuangan_approvals as a')->join('users as u', 'u.id', '=', 'a.assigned_user_id')->where('a.expense_id', $id)->where('a.revision', $expense->revision)->orderBy('u.name')->get(['u.name', 'a.decision', 'a.cancelled_at'])->map(fn ($a) => ['name' => $a->name, 'decision' => $a->decision, 'closed' => $a->cancelled_at !== null]);
        $result['approvals'] = [];
        $result['history'] = [];
        $result['decisionHistory'] = [];
        if ($context['canReadApprovals']) {
            $result['approvals'] = DB::table('keuangan_approvals as a')->join('users as u', 'u.id', '=', 'a.assigned_user_id')->where('a.expense_id', $id)->orderByDesc('a.revision')->orderBy('u.name')->orderBy('a.id')
                ->get(['a.id', 'a.revision', 'a.assigned_user_id', 'u.name', 'a.decision', 'a.note', 'a.version', 'a.cancelled_at', 'a.cancel_reason'])
                ->map(fn ($a) => ['id' => $a->id, 'revision' => $a->revision, 'name' => $a->name, 'decision' => $a->decision, 'note' => $a->note, 'version' => $a->version, 'closed' => $a->cancelled_at !== null, 'closeReason' => $a->cancel_reason, 'mine' => $a->assigned_user_id === $r->user()->id]);
            $result['decisionHistory'] = DB::table('keuangan_approval_events as e')->join('keuangan_approvals as a', 'a.id', '=', 'e.approval_id')->leftJoin('users as actor', 'actor.id', '=', 'e.actor_id')->join('users as assigned', 'assigned.id', '=', 'a.assigned_user_id')->where('a.expense_id', $id)->orderBy('e.recorded_at')->orderBy('e.id')->get(['e.id', 'a.revision', 'e.action', 'e.reason', 'e.changes', 'e.recorded_at', 'actor.name as actor_name', 'assigned.name as subject'])->map(fn ($e) => ['id' => $e->id, 'revision' => $e->revision, 'action' => $e->action, 'reason' => $e->reason, 'actor' => $e->actor_name, 'subject' => $e->subject, 'at' => CarbonImmutable::parse($e->recorded_at, 'UTC')->toISOString(), 'changes' => json_decode($e->changes, true)]);
            $result['history'] = DB::table('keuangan_expense_events as e')->join('users as u', 'u.id', '=', 'e.actor_id')->where('e.expense_id', $id)->orderBy('e.recorded_at')->orderBy('e.id')->get(['e.id', 'e.revision', 'e.action', 'e.reason', 'e.changes', 'e.recorded_at', 'u.name'])->map(fn ($e) => ['id' => $e->id, 'revision' => $e->revision, 'action' => $e->action, 'reason' => $e->reason, 'actor' => $e->name, 'at' => CarbonImmutable::parse($e->recorded_at, 'UTC')->toISOString(), 'changes' => json_decode($e->changes, true)]);
        }

        return $this->data($result);
    }

    public function saveExpense(Request $r, ?string $id = null)
    {
        $this->permission($r, 'canWriteExpenses');
        $data = $this->input($r, ['requestId' => 'required|uuid', 'sourceId' => 'required|string|max:191', 'categoryId' => 'required|string|max:191', 'recipient' => 'nullable|string|max:255', 'recipientIdentity' => 'nullable|string|max:2000', 'programId' => 'required_with:requestedOn,treasurerId|nullable|string|max:191', 'requestedOn' => 'required_with:programId,treasurerId|nullable|date_format:Y-m-d|after_or_equal:1000-01-01|before_or_equal:9999-12-31', 'treasurerId' => 'required_with:programId,requestedOn|nullable|string|max:191', 'description' => 'required|string|max:10000', 'amount' => $this->moneyRule(), 'version' => $id ? 'required|integer|min:1' : 'prohibited', 'reason' => $id ? 'required|string|min:10|max:2000' : 'prohibited']);
        $result = $this->workflow->write($r, 'expense:'.($id ?? 'create'), $data, function () use ($r, $id, $data) {
            $old = $id ? DB::table('keuangan_expenses')->where('id', $id)->lockForUpdate()->first() : null;
            abort_if($id && ! $old, 404);
            abort_if($old && ($old->version !== (int) $data['version'] || $old->archived_at), 409, 'Pengeluaran berubah. Muat ulang sebelum merevisi.');
            foreach (['sourceId' => 'sources', 'categoryId' => 'categories'] as $key => $table) {
                abort_unless(DB::table('keuangan_'.$table)->where('id', $data[$key])->whereNull('archived_at')->exists(), 422, 'Sumber/kategori tidak aktif.');
            }
            if (! empty($data['programId'])) {
                abort_unless(DB::table('keuangan_programs')->where('id', $data['programId'])->whereNull('archived_at')->exists(), 422, 'Pilih jenis program yang aktif.');
                $sources = ['kas infaq', 'kas amil', 'kas riba'];
                $categories = ['cash advance', 'kegiatan sosial', 'operasional', 'lain-lain'];
                foreach (['sourceId' => ['sources', $sources], 'categoryId' => ['categories', $categories]] as $field => [$table, $names]) {
                    abort_unless(in_array(mb_strtolower(trim(DB::table('keuangan_'.$table)->where('id', $data[$field])->value('name'))), $names, true), 422, 'Pilih sumber dana/kategori pengajuan yang tersedia.');
                }
                abort_unless($this->workflow->eligible()->where('users.id', $data['treasurerId'])->where('users.id', '!=', $r->user()->id)->exists(), 422, 'Hanya akun Bendahara SIP aktif yang berbeda dari pembuat pengajuan yang dapat menyetujui.');
            }
            // Revisions of a modern application cannot drop its required approval fields.
            abort_if($old && $old->treasurer_id && empty($data['treasurerId']), 422, 'Program, tanggal, dan Bendahara SIP wajib diisi.');
            $expenseId = $id ?? (string) Str::uuid();
            $revision = $old ? $old->revision + 1 : 1;
            if ($old) {
                foreach (DB::table('keuangan_approvals')->where('expense_id', $id)->where('revision', $old->revision)->whereNull('cancelled_at')->lockForUpdate()->get() as $a) {
                    $this->workflow->cancel($a, 'revised', $r->user()->id);
                }
            }
            $values = ['source_id' => $data['sourceId'], 'category_id' => $data['categoryId'], 'recipient' => $data['recipient'] ?? '', 'recipient_identity' => $data['recipientIdentity'] ?? null, 'program_id' => $data['programId'] ?? $old?->program_id, 'requested_on' => $data['requestedOn'] ?? null, 'treasurer_id' => $data['treasurerId'] ?? null, 'description' => $data['description'], 'amount' => (string) $data['amount'], 'revision' => $revision, 'version' => $old ? $old->version + 1 : 1, 'updated_at' => now()->utc()];
            if ($old) {
                DB::table('keuangan_expenses')->where('id', $id)->update($values);
            } else {
                DB::table('keuangan_expenses')->insert(['id' => $expenseId, ...$values, 'created_by' => $r->user()->id, 'origin' => 'native', 'created_at' => now()->utc()]);
            }
            $expense = DB::table('keuangan_expenses')->where('id', $expenseId)->first();
            $this->workflow->assign($expense);
            $this->workflow->expenseEvent($expenseId, $r->user()->id, $revision, $old ? 'revised' : 'created', ['before' => $old ? $this->expenseRow($old) : null, 'after' => $this->expenseRow($expense)], $data['reason'] ?? null);

            return ['id' => $expenseId, 'revision' => $revision, 'version' => $expense->version];
        });

        return $this->data($result, $id ? 200 : 201);
    }

    public function requestApproval(Request $r, string $id)
    {
        $this->permission($r, 'canWriteExpenses');
        $data = $this->input($r, ['requestId' => 'required|uuid', 'version' => 'required|integer|min:1', 'treasurerId' => 'required|string|max:191', 'reason' => 'required|string|min:10|max:2000']);
        $result = $this->workflow->write($r, 'approval-request:'.$id, $data, function () use ($r, $id, $data) {
            $old = DB::table('keuangan_expenses')->where('id', $id)->lockForUpdate()->first();
            abort_unless($old, 404);
            abort_if($old->archived_at || $old->version !== (int) $data['version'], 409, 'Pengajuan berubah atau diarsipkan. Muat ulang halaman.');
            abort_unless($this->expenseRow($old)['status'] === 'unassigned', 409, 'Pengajuan sudah memiliki penugasan atau keputusan. Gunakan revisi pengajuan bila perlu perubahan.');
            abort_unless($this->workflow->eligible()->where('users.id', $data['treasurerId'])->where('users.id', '!=', $r->user()->id)->exists(), 422, 'Pilih akun Bendahara SIP aktif selain pengirim.');
            $before = $this->expenseRow($old);
            // Preserve every financial field. A new revision separates this request from prior retired tasks.
            DB::table('keuangan_expenses')->where('id', $id)->update(['treasurer_id' => $data['treasurerId'], 'revision' => $old->revision + 1, 'version' => $old->version + 1, 'updated_at' => now()->utc()]);
            $expense = DB::table('keuangan_expenses')->where('id', $id)->first();
            $this->workflow->assign($expense);
            $this->workflow->expenseEvent($id, $r->user()->id, $expense->revision, 'approval_requested', ['before' => $before, 'after' => $this->expenseRow($expense)], trim($data['reason']));

            return ['id' => $id, 'revision' => $expense->revision, 'version' => $expense->version];
        });

        return $this->data($result);
    }

    public function options(Request $r)
    {
        $this->permission($r, 'canWriteExpenses');

        $masters = fn ($kind, $names) => DB::table('keuangan_'.$kind)->whereNull('archived_at')->whereIn(DB::raw('LOWER(TRIM(name))'), $names)->orderBy('id')->get(['id', 'name'])->unique(fn ($item) => mb_strtolower(trim($item->name)))->sortBy(fn ($item) => array_search(mb_strtolower(trim($item->name)), $names, true))->values();

        return $this->data([
            'sources' => $masters('sources', ['kas infaq', 'kas amil', 'kas riba']),
            'categories' => $masters('categories', ['cash advance', 'kegiatan sosial', 'operasional', 'lain-lain']),
            'programs' => DB::table('keuangan_programs')->whereNull('archived_at')->orderBy('name')->get(['id', 'name']),
            'treasurers' => $this->workflow->eligible()->where('users.id', '!=', $r->user()->id)->get(),
        ]);
    }

    public function settings(Request $r)
    {
        $this->permission($r, 'canReadMasters');

        return $this->data(['sources' => DB::table('keuangan_sources')->orderBy('name')->get(['id', 'name', 'archived_at'])->map(fn ($m) => ['id' => $m->id, 'name' => $m->name, 'archived' => $m->archived_at !== null]), 'programs' => DB::table('keuangan_programs')->orderBy('name')->get(['id', 'name', 'archived_at'])->map(fn ($m) => ['id' => $m->id, 'name' => $m->name, 'archived' => $m->archived_at !== null]), 'categories' => DB::table('keuangan_categories')->orderBy('name')->get(['id', 'name', 'archived_at'])->map(fn ($m) => ['id' => $m->id, 'name' => $m->name, 'archived' => $m->archived_at !== null]), 'approvers' => $this->workflow->eligible()->get(), 'rules' => DB::table('keuangan_approval_rules')->orderBy('min_amount')->get()->map(fn ($rule) => ['id' => $rule->id, 'version' => $rule->version, 'minAmount' => (string) $rule->min_amount, 'maxAmount' => (string) $rule->max_amount, 'active' => (bool) $rule->active, 'approverIds' => DB::table('keuangan_rule_approvers')->where('rule_id', $rule->id)->orderBy('user_id')->pluck('user_id')])]);
    }

    public function master(Request $r, string $kind)
    {
        $this->permission($r, 'canWriteMasters');
        abort_unless(in_array($kind, ['sources', 'categories', 'programs'], true), 404);
        $data = $this->input($r, ['requestId' => 'required|uuid', 'name' => 'required|string|max:255']);
        $data['name'] = trim($data['name']);
        abort_if($data['name'] === '', 422);

        return $this->data($this->workflow->write($r, 'master:'.$kind, $data, function () use ($kind, $data) {
            abort_if(DB::table('keuangan_'.$kind)->whereRaw('LOWER(name) = ?', [mb_strtolower($data['name'])])->exists(), 422, 'Nama sudah tersedia.');
            $id = (string) Str::uuid();
            DB::table('keuangan_'.$kind)->insert(['id' => $id, 'name' => $data['name'], 'created_at' => now()->utc(), 'updated_at' => now()->utc()]);

            return ['id' => $id];
        }), 201);
    }

    public function rule(Request $r, ?string $id = null)
    {
        $this->permission($r, 'canWriteMasters');
        $data = $this->input($r, ['requestId' => 'required|uuid', 'minAmount' => ['required', 'string', 'regex:/^(0|[1-9][0-9]{0,15})$/', 'numeric', 'max:9000000000000000'], 'maxAmount' => $this->moneyRule(), 'approverIds' => 'required|array|min:1|max:50', 'approverIds.*' => 'required|string|max:191|distinct', 'active' => 'required|boolean', 'version' => $id ? 'required|integer|min:1' : 'prohibited']);
        sort($data['approverIds']);
        abort_if((int) $data['minAmount'] > (int) $data['maxAmount'], 422, 'Rentang nominal tidak valid.');

        return $this->data($this->workflow->write($r, 'rule:'.($id ?? 'create'), $data, function () use ($id, $data) {
            $old = $id ? DB::table('keuangan_approval_rules')->where('id', $id)->lockForUpdate()->first() : null;
            abort_if($id && ! $old, 404);
            abort_if($old && $old->version !== (int) $data['version'], 409, 'Aturan berubah. Muat ulang.');
            abort_unless($this->workflow->eligible()->whereIn('users.id', $data['approverIds'])->count() === count($data['approverIds']), 422, 'Pilih approver Keuangan aktif yang berizin.');
            if ($data['active']) {
                abort_if(DB::table('keuangan_approval_rules')->when($id, fn ($q) => $q->where('id', '!=', $id))->where('active', true)->where('min_amount', '<=', $data['maxAmount'])->where('max_amount', '>=', $data['minAmount'])->exists(), 422, 'Rentang bertumpuk dengan aturan aktif.');
            }
            $ruleId = $id ?? (string) Str::uuid();
            $values = ['min_amount' => $data['minAmount'], 'max_amount' => $data['maxAmount'], 'active' => $data['active'], 'version' => $old ? $old->version + 1 : 1, 'updated_at' => now()->utc()];
            if ($old) {
                DB::table('keuangan_approval_rules')->where('id', $id)->update($values);
            } else {
                DB::table('keuangan_approval_rules')->insert(['id' => $ruleId, ...$values, 'created_at' => now()->utc()]);
            }
            DB::table('keuangan_rule_approvers')->where('rule_id', $ruleId)->delete();
            foreach ($data['approverIds'] as $user) {
                DB::table('keuangan_rule_approvers')->insert(['rule_id' => $ruleId, 'user_id' => $user]);
            }

            return ['id' => $ruleId, 'version' => $values['version']];
        }), $id ? 200 : 201);
    }

    private function approvalRow(object $a, Request $r): array
    {
        $expense = DB::table('keuangan_expenses')->where('id', $a->expense_id)->first();
        $blocked = DB::table('keuangan_approvals')->where('expense_id', $a->expense_id)->where('revision', $a->revision)->where('id', '!=', $a->id)->where('decision', 'rejected')->exists();

        return ['canDecide' => $r->attributes->get('module_role') === 'treasurer' && $expense?->created_by !== $r->user()->id && (bool) DB::table('modules')->where('slug', 'keuangan')->value('is_active') && ! $a->cancelled_at && $expense && $expense->revision === $a->revision && ! $expense->archived_at && ! $blocked, 'id' => $a->id, 'expenseId' => $a->expense_id, 'revision' => $a->revision, 'version' => $a->version, 'decision' => $a->decision, 'note' => $a->note, 'closed' => $a->cancelled_at !== null, 'closeReason' => $a->cancel_reason];
    }

    public function approvals(Request $r)
    {
        $this->permission($r, 'canReadApprovals');
        $q = DB::table('keuangan_approvals as a')->join('keuangan_expenses as e', 'e.id', '=', 'a.expense_id')->where('a.assigned_user_id', $r->user()->id)->whereColumn('a.revision', 'e.revision')->whereNull('e.archived_at')->select('a.*')->orderByRaw("CASE WHEN a.cancelled_at IS NULL AND a.decision = 'waiting' THEN 0 ELSE 1 END")->orderByDesc('a.created_at')->orderBy('a.id');
        $page = $this->page($q, $r);

        return $this->data(['items' => $page['rows']->map(fn ($a) => [...$this->approvalRow($a, $r), 'expense' => $this->expenseRow(DB::table('keuangan_expenses')->where('id', $a->expense_id)->first())]), ...array_diff_key($page, ['rows' => true])]);
    }

    public function approval(Request $r, string $id)
    {
        $this->permission($r, 'canReadApprovals');
        $a = DB::table('keuangan_approvals')->where('id', $id)->where('assigned_user_id', $r->user()->id)->first();
        abort_unless($a, 404);
        $history = DB::table('keuangan_approval_events as e')->leftJoin('users as u', 'u.id', '=', 'e.actor_id')->where('e.approval_id', $id)->orderBy('e.recorded_at')->orderBy('e.id')->get(['e.id', 'e.action', 'e.changes', 'e.reason', 'e.recorded_at', 'u.name'])->map(fn ($e) => ['id' => $e->id, 'action' => $e->action, 'reason' => $e->reason, 'actor' => $e->name, 'at' => CarbonImmutable::parse($e->recorded_at, 'UTC')->toISOString(), 'changes' => json_decode($e->changes, true)]);

        return $this->data([...$this->approvalRow($a, $r), 'expense' => $this->expenseRow(DB::table('keuangan_expenses')->where('id', $a->expense_id)->first()), 'history' => $history]);
    }

    public function decide(Request $r, string $id)
    {
        $this->permission($r, 'canReadApprovals');
        abort_unless($r->attributes->get('module_role') === 'treasurer', 403, 'Hanya Bendahara SIP yang dapat menyetujui pengajuan.');
        $data = $this->input($r, ['requestId' => 'required|uuid', 'version' => 'required|integer|min:1', 'decision' => 'required|in:approved,rejected', 'note' => 'nullable|string|max:2000', 'reason' => 'nullable|string|max:2000']);
        abort_if($data['decision'] === 'rejected' && mb_strlen(trim($data['note'] ?? '')) < 10, 422, 'Penolakan memerlukan catatan minimal 10 karakter.');

        return $this->data($this->workflow->write($r, 'decision:'.$id, $data, function () use ($r, $id, $data) {
            abort_unless($r->attributes->get('module_role') === 'treasurer', 403);
            $a = DB::table('keuangan_approvals')->where('id', $id)->where('assigned_user_id', $r->user()->id)->lockForUpdate()->first();
            abort_unless($a, 404);
            $expense = DB::table('keuangan_expenses')->where('id', $a->expense_id)->lockForUpdate()->first();
            abort_if($expense->created_by === $r->user()->id, 403, 'Pembuat pengajuan tidak dapat menyetujui pengajuannya sendiri.');
            abort_if($a->version !== (int) $data['version'] || $a->revision !== $expense->revision || $a->cancelled_at || $expense->archived_at, 409, 'Penugasan berubah/ditutup. Muat ulang.');
            abort_if(DB::table('keuangan_approvals')->where('expense_id', $expense->id)->where('revision', $expense->revision)->where('id', '!=', $id)->where('decision', 'rejected')->exists(), 409, 'Pengeluaran masih ditolak approver lain. Revisi penolakan atau buat revisi pengeluaran terlebih dahulu.');
            abort_if($a->decision !== 'waiting' && mb_strlen(trim($data['reason'] ?? '')) < 10, 422, 'Revisi keputusan memerlukan alasan minimal 10 karakter.');
            DB::table('keuangan_approvals')->where('id', $id)->update(['decision' => $data['decision'], 'note' => $data['note'] ?? null, 'version' => $a->version + 1, 'updated_at' => now()->utc()]);
            $this->workflow->approvalEvent($id, $r->user()->id, $a->decision === 'waiting' ? 'decided' : 'decision_revised', ['before' => ['decision' => $a->decision, 'note' => $a->note], 'after' => ['decision' => $data['decision'], 'note' => $data['note'] ?? null]], $data['reason'] ?? null);
            $others = DB::table('keuangan_approvals')->where('expense_id', $expense->id)->where('revision', $expense->revision)->where('id', '!=', $id)->lockForUpdate()->get();
            if ($data['decision'] === 'rejected') {
                foreach ($others as $other) {
                    if ($other->decision === 'waiting' && ! $other->cancelled_at) {
                        $this->workflow->cancel($other, 'rejected', $r->user()->id);
                    }
                }
            } elseif ($a->decision === 'rejected' && ! $others->contains(fn ($o) => $o->decision === 'rejected')) {
                foreach ($others as $other) {
                    if ($other->decision === 'waiting' && $other->cancel_reason === 'rejected') {
                        DB::table('keuangan_approvals')->where('id', $other->id)->update(['cancelled_at' => null, 'cancel_reason' => null, 'version' => $other->version + 1, 'updated_at' => now()->utc()]);
                        $this->workflow->approvalEvent($other->id, $r->user()->id, 'reopened', ['reason' => 'rejection_revised'], $data['reason'] ?? null);
                    }
                }
            }
            DB::table('keuangan_expenses')->where('id', $expense->id)->update(['version' => $expense->version + 1, 'updated_at' => now()->utc()]);

            return ['id' => $id, 'version' => $a->version + 1, 'decision' => $data['decision']];
        }));
    }
}
