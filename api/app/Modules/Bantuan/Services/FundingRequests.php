<?php

namespace App\Modules\Bantuan\Services;

use App\Modules\Bantuan\Models\Application;
use App\Modules\Bantuan\Models\FundingRequest;
use App\Modules\Bantuan\Models\FundingRequestItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\InputBag;

class FundingRequests
{
    public function __construct(private Access $access, private Workflow $workflow) {}

    public static function guardIndividualAction(Request $request, Application $row, string $action): void
    {
        if (! in_array($action, ['fund_approve', 'fund_reject', 'assign_distributor', 'revise_amount'], true)) {
            return;
        }
        $batchId = FundingRequestItem::where('active_application_id', $row->id)->value('funding_request_id');
        // Symfony attributes are server-side state, never JSON, query parameters or HTTP headers.
        $internal = !in_array($action, ['assign_distributor', 'revise_amount'], true)
            && $request->attributes->get('bantuan_funding_request_id') === $batchId;
        abort_if($batchId && ! $internal, 409, 'Pengajuan berada dalam kartu dana aktif. Catat keputusan melalui menu Pengajuan dana.');
    }

    public function visible(Request $request)
    {
        abort_unless($this->access->has($request, ['admin', 'fund_requester', 'treasurer', 'chair', 'observer', 'call_center']), 403);
        $visible = $this->access->scope(Application::query(), $request)->select('id');

        // A card is visible only when every member is in the caller's application scope.
        return FundingRequest::query()->whereDoesntHave('items', fn ($q) => $q->whereNotIn('application_id', $visible));
    }

    public function create(Request $request): FundingRequest
    {
        $this->access->allow($request, ['fund_requester']);
        $data = $request->validate([
            'title' => 'required|string|max:191', 'notes' => 'nullable|string|max:5000',
            'items' => 'required|array|min:1|max:100',
            'items.*.id' => 'required|uuid|distinct', 'items.*.version' => 'required|integer|min:1',
        ]);

        return DB::transaction(function () use ($request, $data) {
            $rows = $this->lockedApplications($request, $data['items'], 'fund_ready');
            abort_if(FundingRequestItem::whereIn('active_application_id', $rows->modelKeys())->exists(), 409,
                'Salah satu pengajuan sudah tercantum dalam kartu dana aktif.');
            foreach ($rows as $row) {
                abort_unless($row->amount > 0 && $row->amount <= 9000000000000, 409, 'Nominal bantuan belum valid.');
            }
            $id = (string) Str::uuid();
            $batch = new FundingRequest;
            $batch->forceFill([
                'id' => $id, 'number' => 'DANA-'.strtoupper($id),
                'title' => $data['title'], 'notes' => $data['notes'] ?? null,
                'status' => 'submitted', 'total_amount' => $rows->sum('amount'),
                'version' => 1, 'created_by' => $request->user()->id,
            ])->save();
            foreach ($rows as $row) {
                $submitted = $this->transition($request, $row, 'fund_submit', ['reference' => $batch->number]);
                $item = new FundingRequestItem;
                $item->forceFill([
                    'id' => (string) Str::uuid(), 'funding_request_id' => $batch->id,
                    'application_id' => $row->id, 'active_application_id' => $row->id,
                    'number' => $row->number, 'name' => $row->name, 'program' => $row->program,
                    'region' => $row->region, 'amount' => $row->amount, 'submitted_version' => $submitted->version,
                ])->save();
            }

            return $batch;
        }, 3);
    }

    public function decide(Request $request, string $id, ?array $manual = null): FundingRequest
    {
        $this->access->allow($request, $manual !== null ? ['call_center'] : ['fund_requester']);
        $data = $request->validate([
            'version' => 'required|integer|min:1', 'decision' => 'required|in:approved,rejected',
            'reason' => 'required_if:decision,rejected|nullable|string|min:5|max:5000',
            'items' => 'required|array|min:1|max:100',
            'items.*.id' => 'required|uuid|distinct', 'items.*.version' => 'required|integer|min:1',
        ]);

        return DB::transaction(function () use ($request, $id, $data, $manual) {
            $batch = $this->visible($request)->lockForUpdate()->findOrFail($id);
            abort_unless($batch->version === $data['version'] && $batch->status === 'submitted', 409,
                'Kartu dana sudah berubah atau sudah diputuskan. Muat ulang data.');
            $items = $batch->items()->get()->keyBy('application_id');
            $ids = collect($data['items'])->pluck('id')->sort()->values()->all();
            abort_unless($ids === $items->keys()->sort()->values()->all(), 422, 'Keputusan harus mencakup seluruh isi kartu dana.');
            $rows = $this->lockedApplications($request, $data['items'], 'fund_submitted');
            foreach ($rows as $row) {
                abort_unless($items[$row->id]->amount === $row->amount, 409, 'Nominal bantuan berubah sejak kartu dibuat.');
            }
            foreach ($rows as $row) {
                $updated = $this->transition($request, $row, $data['decision'] === 'approved' ? 'fund_approve' : 'fund_reject',
                    ['reason' => $data['reason'] ?? null], $batch->id, $manual);
                // Snapshot fields never change, including when a rejected application is submitted again.
                $items[$row->id]->forceFill(['active_application_id' => null, 'decision_version' => $updated->version])->save();
            }
            $batch->forceFill([
                'status' => $data['decision'], 'reason' => $data['reason'] ?? null,
                'decided_by' => $request->user()->id, 'decided_at' => now(), 'version' => $batch->version + 1,
            ])->save();

            return $batch;
        }, 3);
    }

    private function lockedApplications(Request $request, array $items, string $stage)
    {
        $versions = collect($items)->keyBy('id');
        // Consistent lock ordering serializes overlapping batches and decisions.
        $rows = $this->access->scope(Application::query(), $request)->whereIn('id', $versions->keys())
            ->orderBy('id')->lockForUpdate()->get();
        abort_unless($rows->count() === count($items), 404, 'Pengajuan tidak ditemukan dalam akses Anda.');
        foreach ($rows as $row) {
            abort_unless($row->version === (int) $versions[$row->id]['version'] && $row->status === $stage, 409,
                'Pengajuan sudah berubah versi atau tahap. Muat ulang sebelum melanjutkan.');
        }

        return $rows;
    }

    private function transition(Request $request, Application $row, string $action, array $extra, ?string $batchId = null, ?array $manual = null): Application
    {
        $step = clone $request;
        $input = ['version' => $row->version, ...$extra];
        $step->setJson(new InputBag($input));
        $step->request = new InputBag($input);
        $step->attributes->set('bantuan_funding_request_id', $batchId);

        return $this->workflow->perform($step, $row->id, $action, $manual);
    }

    public static function descriptionFields(Application $row): array
    {
        $applicant = $row->applicant ?? [];
        $survey = $row->survey ?? [];
        return [
            'problem' => (string) ($applicant['problem'] ?? ''),
            'needs' => (string) (($applicant['intakeType'] ?? null) === 'other'
                ? trim(($applicant['customTitle'] ?? '')."\n".($applicant['customBudget'] ?? ''))
                : ($survey['needs'] ?? $applicant['bypassNeeds'] ?? '')),
        ];
    }

    public function payload(FundingRequest $batch): array
    {
        $batch->loadMissing('items.application');
        $distributors = DB::table('users')->whereIn('id', $batch->items->map(fn ($item) => $item->application->distributor_id)->filter()->unique())->pluck('name', 'id');

        return [
            'id' => $batch->id, 'number' => $batch->number, 'title' => $batch->title, 'notes' => $batch->notes,
            'status' => $batch->status, 'totalAmount' => $batch->total_amount, 'version' => $batch->version,
            'createdBy' => $batch->created_by, 'createdAt' => $batch->created_at->toISOString(),
            'decidedBy' => $batch->decided_by, 'decidedAt' => $batch->decided_at?->toISOString(), 'reason' => $batch->reason,
            'items' => $batch->items->map(fn ($item) => [
                'id' => $item->application_id, 'number' => $item->number, 'name' => $item->name,
                'program' => $item->program, 'region' => $item->region, 'amount' => $item->amount,
                'submittedVersion' => $item->submitted_version, 'decisionVersion' => $item->decision_version,
                'version' => $item->application->version, 'status' => $item->application->status,
                'currentAmount' => $item->application->amount,
                'distributorName' => $item->application->manual_process['distributor']['name'] ?? ($item->application->distribution_type === 'direct' ? 'Bendahara langsung'
                    : ($distributors[$item->application->distributor_id] ?? 'Belum ditetapkan')),
                ...self::descriptionFields($item->application),
            ])->values(),
        ];
    }
}
