<?php

namespace App\Modules\Bantuan\Http\Controllers;

use App\Modules\Bantuan\Models\Application;
use App\Modules\Bantuan\Services\Access;
use App\Modules\Bantuan\Services\ApplicationQuery;
use App\Modules\Bantuan\Services\Intake;
use App\Modules\Bantuan\Services\Journal;
use App\Modules\Bantuan\Services\Workflow;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class BantuanController
{
    private function settings(): array
    {
        return json_decode(DB::table('bantuan_settings')->where('key', 'general')->value('value'), true, 512, JSON_THROW_ON_ERROR);
    }

    public function viewer(Request $request, Access $access)
    {
        return response()->json(['data' => ['id' => $request->user()->id, 'name' => $request->user()->name,
            'role' => $access->role($request), 'roles' => $access->roles($request), 'canBypass' => $access->bypass($request), 'settings' => $this->settings()]]);
    }

    public function switchRole(Request $request, Access $access, Journal $journal)
    {
        $role = $request->validate(['role' => 'required|string|max:50'])['role'];
        abort_unless(in_array($role, $access->roles($request), true), 403, 'Peran ini tidak diberikan kepada akun Anda.');
        DB::table('bantuan_active_roles')->updateOrInsert(['session_key' => $access->sessionKey($request)], ['user_id' => $request->user()->id, 'role' => $role]);
        $request->attributes->set('bantuan_active_role', $role);
        $journal->record($request, null, 'switch_role', null, ['role' => $role]);
        return response()->json(['data' => ['role' => $role]]);
    }

    private function summary(Application $row): array
    {
        return ['id' => $row->id, 'number' => $row->number, 'name' => $row->name, 'status' => $row->status,
            'createdBy' => $row->created_by,
            'program' => $row->program, 'region' => $row->region, 'source' => $row->source, 'amount' => $row->amount,
            'verifierId' => $row->verifier_id, 'distributorId' => $row->distributor_id, 'distributionType' => $row->distribution_type,
            'version' => $row->version, 'createdAt' => $row->created_at->toIso8601String(), 'updatedAt' => $row->updated_at->toIso8601String(),
            'disbursedAt' => $row->disbursed_at?->toDateString(), 'completedAt' => $row->completed_at?->toDateString()];
    }

    private function applicantHistory(Request $request, Access $access, string $nikHash, ?string $excludeId = null)
    {
        return $access->scope(Application::query(), $request)->where('nik_hash', $nikHash)
            ->when($excludeId, fn ($query) => $query->where('id', '!=', $excludeId))
            ->latest('created_at')->orderBy('id')->get(['id', 'number', 'program', 'status', 'amount', 'created_at'])
            ->map(fn ($item) => ['id' => $item->id, 'number' => $item->number, 'program' => $item->program,
                'status' => $item->status, 'amount' => $item->amount, 'createdAt' => $item->created_at->toIso8601String()]);
    }

    public function index(Request $request, Access $access, ApplicationQuery $listing)
    {
        $data = $listing->filters($request);
        $query = $listing->build($request, $access, $data);
        $rows = $listing->ordered(clone $query, $data)->paginate($data['perPage'] ?? 20);
        $scope = $access->scope(Application::query(), $request);
        $options = ['programs' => (clone $scope)->whereNotNull('program')->distinct()->orderBy('program')->pluck('program'),
            'regions' => (clone $scope)->whereNotNull('region')->where('region', '!=', '')->distinct()->orderBy('region')->pluck('region')];

        $summary = ! empty($data['summary']) ? [
            'total' => $rows->total(), 'byStatus' => (clone $query)->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status'),
            'approvedAmount' => (int) (clone $query)->whereNotIn('status', ['cancelled', 'rejected_t2', 'rejected_bypass', 'returned'])->sum('amount'),
            'disbursedAmount' => (int) (clone $query)->whereIn('status', ['disbursed', 'completed', 'delivery_failed'])->sum('amount'),
            'completedAmount' => (int) (clone $query)->where('status', 'completed')->cursor()->sum(fn ($row) => $row->handover['amount'] ?? $row->amount),
            'overdue' => (clone $query)->where('status', 'disbursed')->where('disbursed_at', '<', now()->subDays($this->settings()['distributionDays']))->count(),
        ] : null;
        return response()->json(['data' => $rows->getCollection()->map(fn ($row) => $this->summary($row)), 'current_page' => $rows->currentPage(), 'last_page' => $rows->lastPage(), 'total' => $rows->total(), 'per_page' => $rows->perPage(), 'filterOptions' => $options, 'summary' => $summary]);
    }

    public function show(Request $request, string $id, Access $access)
    {
        $row = $access->find($request, $id);
        $applicant = $row->applicant;
        if (! $access->sensitive($request)) {
            $private = $applicant;
            $applicant = ['name' => $applicant['name'], 'nik' => substr($applicant['nik'], 0, 6).'xxxxxxxxxx',
                'city' => $applicant['city'], 'district' => $applicant['district'], 'publicationConsent' => $applicant['publicationConsent']];
            if ($access->role($request) === 'treasurer' && $row->distribution_type === 'direct') {
                foreach (['street', 'rtRw', 'village', 'phone'] as $field) $applicant[$field] = $private[$field] ?? null;
            }
        }
        $duplicates = Application::where('nik_hash', $row->nik_hash)->where('id', '!=', $row->id)->count();
        $documents = DB::table('bantuan_documents')->where('application_id', $id)->whereNull('deleted_at');
        if (! $access->sensitive($request)) {
            $documents->whereNotIn('kind', ['ktp', 'kk', 'supporting', 'sktm', 'face', 'survey_recipient', 'survey_front', 'survey_inside', 'survey_environment', 'survey_other']);
        }
        $events = DB::table('bantuan_events')->leftJoin('users', 'users.id', '=', 'bantuan_events.actor_id')->where('application_id', $id)
            ->orderBy('bantuan_events.created_at')->get(['bantuan_events.id', 'action', 'from_status', 'to_status', 'actor_role', 'bantuan_events.created_at', 'users.name as actorName', 'details'])
            ->map(function ($event) use ($access, $request) {
                $details = json_decode(Crypt::decryptString($event->details), true);
                $event->reason = $details['reason'] ?? null;
                if ($event->reason && ! $access->sensitive($request)) {
                    $event->reason = preg_replace('/[0-9]{7,}/', '********', $event->reason);
                }
                unset($event->details);

                return $event;
            });

        return response()->json(['data' => [...$this->summary($row), 'applicant' => $applicant,
            'bypassReason' => $row->bypass_reason, 'survey' => $access->sensitive($request) ? $row->survey : null, 'handover' => $row->handover,
            'fundReference' => $row->fund_reference, 'duplicateCount' => $duplicates,
            'duplicateApplications' => $this->applicantHistory($request, $access, $row->nik_hash, $row->id),
            'documents' => $documents->get(['id', 'kind', 'mime', 'created_at', 'used_at', 'caption'])->map(function ($doc) { $doc->caption = $doc->caption ? Crypt::decryptString($doc->caption) : null; return $doc; }), 'events' => $events]]);
    }

    public function store(Request $request, Intake $intake)
    {
        $row = $intake->save($request);

        return response()->json(['data' => $this->summary($row)], 201);
    }

    public function update(Request $request, string $id, Intake $intake)
    {
        return response()->json(['data' => $this->summary($intake->save($request, $id))]);
    }

    public function action(Request $request, string $id, string $action, Workflow $workflow)
    {
        return response()->json(['data' => $this->summary($workflow->perform($request, $id, $action))]);
    }

    public function destroy(Request $request, string $id, Access $access, \App\Modules\Bantuan\Services\ApplicationDeletion $deletion)
    {
        $access->allow($request, ['call_center', 'verifier']);
        $input = $request->validate(['version' => 'required|integer|min:1']);
        $paths = DB::transaction(function () use ($request, $id, $access, $input, $deletion) {
            $row = $access->find($request, $id, true);
            abort_unless($access->role($request) === 'admin' || $row->created_by === $request->user()->id, 403, 'Hanya draft sendiri yang dapat dihapus.');
            abort_unless($row->version === $input['version'], 409, 'Data sudah berubah. Muat ulang terlebih dahulu.');
            abort_unless($row->status === 'draft', 409, 'Pengajuan sudah dikirim. Gunakan Batalkan pengajuan, bukan hapus.');

            return $deletion->records([$row->id]);
        });
        $deletion->files($paths);

        return response()->json(['ok' => true]);
    }

    public function batch(Request $request, Workflow $workflow)
    {
        $input = $request->validate(['action' => 'required|in:approve,fund_submit,fund_approve,fund_reject,disburse',
            'items' => 'required|array|min:1|max:50', 'items.*.id' => 'required|uuid|distinct', 'items.*.version' => 'required|integer|min:1',
            'items.*.amount' => 'nullable|integer|min:1', 'items.*.transferAmount' => 'nullable|integer|min:1']);
        $results = DB::transaction(function () use ($request, $input, $workflow) {
            $result = [];
            if ($input['action'] === 'disburse') {
                app(Access::class)->allow($request, ['treasurer']);
                $rows = app(Access::class)->scope(Application::query(), $request)->whereIn('id', array_column($input['items'], 'id'))->orderBy('id')->lockForUpdate()->get();
                $request->validate(['totalAmount' => 'required|integer|min:1']);
                abort_unless($rows->count() === count($input['items']) && $rows->every(fn ($row) => $row->distribution_type === 'verifier')
                    && $rows->pluck('distributor_id')->unique()->count() === 1, 422, 'Pencairan massal hanya untuk satu Verifikator penyalur.');
                abort_unless((int) $request->input('totalAmount') === (int) $rows->sum('amount'), 422, 'Total transfer harus sesuai jumlah nominal semua penerima.');
            }
            // A stable lock order prevents concurrent batch deadlocks.
            $items = collect($input['items'])->sortBy('id');
            foreach ($items as $item) {
                $copy = clone $request;
                $copy->merge($item);
                $result[] = $this->summary($workflow->perform($copy, $item['id'], $input['action']));
            }

            return $result;
        }, 3);

        return response()->json(['data' => $results]);
    }

    public function duplicate(Request $request, Access $access, Intake $intake)
    {
        $access->allow($request, ['call_center', 'verifier']);
        $data = $request->validate(['nik' => 'required|digits:16', 'excludeId' => 'nullable|uuid']);
        $hash = $intake->nikHash($data['nik']);
        return response()->json(['data' => ['count' => Application::where('nik_hash', $hash)
            ->when($data['excludeId'] ?? null, fn ($query, $id) => $query->where('id', '!=', $id))->count(),
            'applications' => $this->applicantHistory($request, $access, $hash, $data['excludeId'] ?? null)]]);
    }

    public function searchApplicants(Request $request, Access $access, Intake $intake)
    {
        $access->allow($request, ['call_center', 'verifier']);
        $data = $request->validate(['query' => 'required|string|min:2|max:191', 'excludeId' => 'nullable|uuid']);
        $term = trim($data['query']);
        if (strlen($term) < 2 || (ctype_digit($term) && strlen($term) !== 16)) return response()->json(['data' => []]);
        $query = $access->scope(Application::query(), $request)
            ->when($data['excludeId'] ?? null, fn ($q, $id) => $q->where('id', '!=', $id));
        if (ctype_digit($term)) $query->where('nik_hash', $intake->nikHash($term));
        else $query->where('name', 'like', '%'.str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $term).'%');
        $people = $query->latest('created_at')->orderBy('id')->limit(100)->get()->unique('nik_hash')->take(12);
        return response()->json(['data' => $people->map(fn ($row) => ['id' => $row->id, 'name' => $row->name,
            'nikLabel' => substr($row->applicant['nik'], 0, 6).'••••••'.substr($row->applicant['nik'], -4),
            'program' => $row->program, 'createdAt' => $row->created_at->toIso8601String()])->values()]);
    }

    public function document(Request $request, string $id, Access $access, Journal $journal)
    {
        return DB::transaction(function () use ($request, $id, $access, $journal) {
            $row = $access->find($request, $id, true);
            $data = $request->validate(['kind' => 'required|in:face,ktp,kk,supporting,sktm,survey_recipient,survey_front,survey_inside,survey_environment,survey_other,transfer,handover,certificate,receipt,return',
                'file' => 'required|file|mimes:jpg,jpeg,png,webp|max:2048', 'clientId' => 'nullable|uuid', 'caption' => 'nullable|string|max:1000']);
            $role = $access->role($request);
            $kind = $data['kind'];
            if ($role !== 'admin') {
                $allowed = match (true) {
                    in_array($kind, ['face', 'ktp', 'kk', 'supporting'], true) => in_array($role, ['call_center', 'verifier'], true) && in_array($row->status, ['draft', 'needs_data', 'screening'], true) && ($role !== 'verifier' || $row->created_by === $request->user()->id),
                    str_starts_with($kind, 'survey_') || $kind === 'sktm' => $role === 'verifier' && $row->verifier_id === $request->user()->id && $row->status === 'survey_assigned',
                    in_array($kind, ['transfer', 'return'], true) => $role === 'treasurer' && in_array($row->status, ['fund_approved', 'disbursed', 'delivery_failed'], true),
                    default => $row->status === 'disbursed' && (($role === 'verifier' && $row->distribution_type === 'verifier' && $row->distributor_id === $request->user()->id) || ($role === 'treasurer' && $row->distribution_type === 'direct')),
                };
                abort_unless($allowed, 403, 'Dokumen ini tidak dapat diunggah pada tahap/peran Anda.');
            }
            abort_if(in_array($row->status, ['completed', 'returned', 'cancelled'], true), 409, 'Pengajuan sudah ditutup. Dokumen tidak dapat ditambahkan.');
            $docId = $data['clientId'] ?? (string) Str::uuid();
            $existing = DB::table('bantuan_documents')->where('id', $docId)->first();
            if ($existing) {
                abort_unless($existing->application_id === $id && $existing->uploaded_by === $request->user()->id && $existing->kind === $kind && ! $existing->deleted_at, 409, 'Identitas unggahan sudah digunakan.');
                return response()->json(['data' => ['id' => $existing->id, 'kind' => $existing->kind]]);
            }
            $path = 'bantuan/'.$row->id.'/'.$docId.'.enc';
            $written = Storage::disk('local')->put($path, Crypt::encryptString(file_get_contents($data['file']->getRealPath())));
            abort_unless($written, 503, 'Penyimpanan dokumen gagal.');
            DB::table('bantuan_documents')->insert(['id' => $docId, 'application_id' => $id, 'kind' => $kind, 'path' => $path,
                'caption' => isset($data['caption']) ? Crypt::encryptString($data['caption']) : null, 'mime' => $data['file']->getMimeType(), 'uploaded_by' => $request->user()->id, 'created_at' => now()]);
            $journal->record($request, $row, 'upload_document', $row->status, ['documentId' => $docId, 'kind' => $kind]);

            return response()->json(['data' => ['id' => $docId, 'kind' => $kind]], 201);
        });
    }

    public function download(Request $request, string $id, Access $access, Journal $journal)
    {
        $doc = DB::table('bantuan_documents')->where('id', $id)->whereNull('deleted_at')->firstOrFail();
        $row = $access->find($request, $doc->application_id);
        if (in_array($doc->kind, ['face', 'ktp', 'kk', 'supporting', 'sktm'], true) || str_starts_with($doc->kind, 'survey_')) {
            abort_unless($access->sensitive($request), 403);
        }
        $journal->record($request, $row, 'read_document', $row->status, ['documentId' => $id]);
        $bytes = Crypt::decryptString(Storage::disk('local')->get($doc->path));

        return response($bytes, 200, ['Content-Type' => $doc->mime, 'Cache-Control' => 'no-store, private',
            'Content-Disposition' => 'inline; filename="'.$doc->kind.'.jpg"', 'X-Content-Type-Options' => 'nosniff']);
    }

    public function dashboard(Request $request, Access $access, ApplicationQuery $listing)
    {
        $q = $listing->build($request, $access, $listing->filters($request));
        $days = $this->settings()['distributionDays'];

        return response()->json(['data' => [
            'total' => (clone $q)->count(), 'byStatus' => (clone $q)->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status'),
            'taskCounts' => [
                'survey' => (clone $q)->where('verifier_id', $request->user()->id)->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status'),
                'distribution' => (clone $q)->where('distributor_id', $request->user()->id)->selectRaw('status, COUNT(*) as total')->groupBy('status')->pluck('total', 'status'),
            ],
            'byProgram' => (clone $q)->selectRaw('program, COUNT(*) as total')->groupBy('program')->pluck('total', 'program'),
            'bySource' => (clone $q)->selectRaw('source, COUNT(*) as total')->groupBy('source')->pluck('total', 'source'),
            'approvedAmount' => (int) (clone $q)->whereNotIn('status', ['cancelled', 'rejected_t2', 'rejected_bypass', 'returned'])->sum('amount'),
            'disbursedAmount' => (int) (clone $q)->whereIn('status', ['disbursed', 'completed', 'delivery_failed'])->sum('amount'),
            'completedAmount' => (int) (clone $q)->where('status', 'completed')->cursor()->sum(fn ($row) => $row->handover['amount'] ?? $row->amount),
            'overdue' => (clone $q)->where('status', 'disbursed')->where('disbursed_at', '<', now()->subDays($days))->count(),
            'tickets' => (clone $q)->where('status', 'fund_approved')->selectRaw('distributor_id, distribution_type, COUNT(*) as total, SUM(amount) as amount')->groupBy('distributor_id', 'distribution_type')->get(),
        ]]);
    }

    public function notifications(Request $request)
    {
        return response()->json(['data' => DB::table('bantuan_notifications')->where('user_id', $request->user()->id)->latest('created_at')->limit(50)->get()]);
    }

    public function export(Request $request, Access $access, ApplicationQuery $listing)
    {
        $access->allow($request, ['approver', 'chair', 'fund_requester', 'treasurer']);
        $filters = $listing->filters($request);
        app(Journal::class)->record($request, null, 'export_summary', null);

        return response()->streamDownload(function () use ($request, $access, $listing, $filters) {
            $out = fopen('php://output', 'w');
            fwrite($out, "\xEF\xBB\xBF");
            fputcsv($out, ['Nomor', 'Nama', 'Program', 'Wilayah', 'Jalur', 'Status', 'Nominal', 'Tanggal'], ',', '"', '');
            foreach ($listing->ordered($listing->build($request, $access, $filters), $filters)->cursor() as $row) {
                $values = [$row->number, $row->name, $row->program, $row->region, $row->source, $row->status, $row->amount, $row->created_at->toDateString()];
                fputcsv($out, array_map(fn ($v) => preg_match('/^[=+@\\-\\t\\r]/u', (string) $v) ? "'".$v : $v, $values), ',', '"', '');
            }
            fclose($out);
        }, 'ringkasan-bantuan-'.now()->format('Y-m-d').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8', 'Cache-Control' => 'no-store, private']);
    }

    public function readNotification(Request $request, string $id)
    {
        DB::table('bantuan_notifications')->where('id', $id)->where('user_id', $request->user()->id)->update(['read_at' => now()]);

        return response()->json(['ok' => true]);
    }

    public function audit(Request $request, Access $access)
    {
        $access->allow($request, ['chair']);
        $filters = $request->validate(['search' => 'nullable|string|max:191', 'role' => 'nullable|string|max:50', 'action' => 'nullable|string|max:100',
            'from' => 'nullable|date_format:Y-m-d', 'to' => ['nullable', 'date_format:Y-m-d', ...($request->filled('from') ? ['after_or_equal:from'] : [])]]);
        $query = DB::table('bantuan_events')->leftJoin('users', 'users.id', '=', 'bantuan_events.actor_id')
            ->leftJoin('bantuan_applications', 'bantuan_applications.id', '=', 'bantuan_events.application_id')
            ->select(['bantuan_events.*', 'users.name as actorName', 'bantuan_applications.number as applicationNumber']);
        if (! empty($filters['role'])) $query->where('actor_role', $filters['role']);
        if (! empty($filters['action'])) $query->where('action', $filters['action']);
        if (! empty($filters['from'])) $query->whereDate('bantuan_events.created_at', '>=', $filters['from']);
        if (! empty($filters['to'])) $query->whereDate('bantuan_events.created_at', '<=', $filters['to']);
        if (! empty($filters['search'])) $query->where(fn ($q) => $q->where('users.name', 'like', '%'.$filters['search'].'%')->orWhere('bantuan_applications.number', 'like', '%'.$filters['search'].'%'));
        $rows = $query->orderByDesc('bantuan_events.created_at')->orderBy('bantuan_events.id')->paginate(30);
        $rows->setCollection($rows->getCollection()->map(function ($event) {
            $event->details = json_decode(Crypt::decryptString($event->details), true);

            return $event;
        }));

        return response()->json($rows);
    }

    public function master(Request $request, Access $access, Journal $journal)
    {
        $access->allow($request, []);
        if ($request->isMethod('PUT')) {
            $input = $request->validate(['programs' => 'required|array|min:1|max:30', 'programs.*' => 'required|string|max:191',
                'regions' => 'present|array|max:100', 'regions.*' => 'required|string|max:191', 'housing' => 'required|array|min:1|max:20',
                'housing.*' => 'required|string|max:191', 'minimumSurveyPhotos' => 'required|integer|min:5|max:30',
                'distributionDays' => 'required|integer|min:1|max:365', 'closingText' => 'nullable|string|max:10000']);
            DB::transaction(function () use ($request, $input, $journal) {
                DB::table('bantuan_settings')->where('key', 'general')->update(['value' => json_encode($input)]);
                $journal->record($request, null, 'update_settings', null, $input);
            });
        }

        return response()->json(['data' => $this->settings()]);
    }
}
