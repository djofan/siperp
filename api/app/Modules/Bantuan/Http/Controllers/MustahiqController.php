<?php

namespace App\Modules\Bantuan\Http\Controllers;

use App\Modules\Bantuan\Models\Application;
use App\Modules\Bantuan\Models\MustahiqProfile;
use App\Modules\Bantuan\Services\Access;
use App\Modules\Bantuan\Services\Intake;
use App\Modules\Bantuan\Services\Journal;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MustahiqController
{
    private function authorize(Request $request, Access $access, bool $write = false): void
    {
        // Deliberately no implicit administrator write bypass: only Call Center edits this directory.
        $roles = $access->roles($request);
        abort_unless($write ? in_array('call_center', $roles, true) : (bool) array_diff($roles, ['verifier', 'volunteer']), 403, 'Akses Data Mustahiq tidak diizinkan untuk peran Anda.');
    }

    public function index(Request $request, Access $access, Intake $intake)
    {
        $this->authorize($request, $access);
        $data = $request->validate(['search' => 'nullable|string|max:191', 'received' => 'nullable|in:yes,no', 'page' => 'nullable|integer|min:1']);
        $query = DB::table('bantuan_applications as a')->leftJoin('bantuan_mustahiq_profiles as p', 'p.nik_hash', '=', 'a.nik_hash');
        if ($search = trim($data['search'] ?? '')) {
            $query->where(function ($q) use ($search, $intake) {
                $q->where('a.name', 'like', '%'.$search.'%')->orWhere('p.name', 'like', '%'.$search.'%');
                if (preg_match('/^\d{16}$/', $search)) $q->orWhere('a.nik_hash', $intake->nikHash($search));
            });
        }
        // Filter identities, not individual rows, to keep counts across the complete history.
        $hashes = $query->select('a.nik_hash')->distinct();
        $groups = DB::table('bantuan_applications')->whereIn('nik_hash', $hashes)
            ->selectRaw("nik_hash, COUNT(*) as records, SUM(CASE WHEN status <> 'draft' THEN 1 ELSE 0 END) as submissions, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as received, MAX(created_at) as last_submission")
            ->groupBy('nik_hash');
        if (($data['received'] ?? '') === 'yes') $groups->havingRaw("SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) > 0");
        if (($data['received'] ?? '') === 'no') $groups->havingRaw("SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) = 0");
        $page = $groups->orderByDesc('last_submission')->orderBy('nik_hash')->paginate(18);
        $identities = $page->getCollection()->pluck('nik_hash');
        $profiles = MustahiqProfile::whereIn('nik_hash', $identities)->get()->keyBy('nik_hash');
        $latest = Application::whereIn('nik_hash', $identities)->whereNotExists(function ($newer) {
            $newer->selectRaw('1')->from('bantuan_applications as newer')
                ->whereColumn('newer.nik_hash', 'bantuan_applications.nik_hash')
                ->where(function ($after) {
                    $after->whereColumn('newer.created_at', '>', 'bantuan_applications.created_at')
                        ->orWhere(function ($tie) { $tie->whereColumn('newer.created_at', 'bantuan_applications.created_at')->whereColumn('newer.id', '>', 'bantuan_applications.id'); });
                });
        })->get()->keyBy('nik_hash');
        return response()->json(['data' => $page->getCollection()->map(function ($group) use ($profiles, $latest) {
            $row = $latest[$group->nik_hash];
            $person = $profiles->get($group->nik_hash)?->applicant ?? $row->applicant;
            return ['id' => $row->id, 'name' => $person['name'] ?? $row->name, 'nik' => $person['nik'] ?? '',
                'city' => $person['city'] ?? '', 'phone' => $person['phone'] ?? '', 'records' => (int) $group->records,
                'submissions' => (int) $group->submissions, 'received' => (int) $group->received, 'lastSubmission' => $group->last_submission];
        }), 'total' => $page->total(), 'current_page' => $page->currentPage(), 'last_page' => $page->lastPage()]);
    }

    public function show(Request $request, string $id, Access $access)
    {
        $this->authorize($request, $access);
        $row = Application::findOrFail($id);
        $profile = MustahiqProfile::find($row->nik_hash);
        $rows = Application::where('nik_hash', $row->nik_hash)->orderByDesc('created_at')->orderByDesc('id')->get();
        $latest = $rows->first();
        $received = $rows->where('status', 'completed');
        $openIds = $access->scope(Application::query(), $request)->where('nik_hash', $row->nik_hash)->pluck('id')->flip();
        return response()->json(['data' => ['id' => $row->id, 'applicant' => $profile?->applicant ?? $latest->applicant,
            'version' => $profile?->version ?? 0, 'sourceVersion' => $latest->version, 'sourceId' => $latest->id,
            'canEdit' => in_array('call_center', $access->roles($request), true), 'updatedAt' => ($profile?->updated_at ?? $latest->updated_at)->toIso8601String(),
            'summary' => ['records' => $rows->count(), 'submissions' => $rows->where('status', '!=', 'draft')->count(),
                'drafts' => $rows->where('status', 'draft')->count(), 'received' => $received->count(),
                'receivedAmount' => $received->sum(fn ($item) => $item->handover['amount'] ?? $item->amount ?? 0)],
            'history' => $rows->map(fn ($item) => ['id' => $item->id, 'number' => $item->number, 'program' => $item->program,
                'status' => $item->status, 'source' => $item->source, 'amount' => $item->amount,
                'receivedAmount' => $item->status === 'completed' ? ($item->handover['amount'] ?? $item->amount) : null,
                'createdAt' => $item->created_at->toIso8601String(), 'completedAt' => $item->completed_at?->toDateString(),
                'canOpen' => $openIds->has($item->id)])]]);
    }

    public function update(Request $request, string $id, Access $access, Intake $intake, Journal $journal)
    {
        $this->authorize($request, $access, true);
        $data = $request->validate(['version' => 'required|integer|min:0', 'sourceVersion' => 'required|integer|min:1', 'sourceId' => 'required|uuid']);
        $applicant = $intake->validateApplicant($request, true);
        DB::transaction(function () use ($request, $id, $data, $applicant, $intake, $journal) {
            $row = Application::findOrFail($id);
            $latest = Application::where('nik_hash', $row->nik_hash)->orderByDesc('created_at')->orderByDesc('id')->lockForUpdate()->firstOrFail();
            abort_unless($latest->id === $data['sourceId'] && $latest->version === $data['sourceVersion'], 409, 'Data pengajuan telah berubah. Muat ulang sebelum mengedit.');
            abort_unless(hash_equals($row->nik_hash, $intake->nikHash($applicant['nik'])), 422, 'NIK identitas tidak dapat diganti dari profil. Koreksi NIK melalui pengajuan terkait.');
            $profile = MustahiqProfile::whereKey($row->nik_hash)->lockForUpdate()->first();
            abort_unless(($profile?->version ?? 0) === $data['version'], 409, 'Profil baru saja diperbarui petugas lain. Muat ulang terlebih dahulu.');
            $before = $profile?->applicant ?? $latest->applicant;
            $profile ??= new MustahiqProfile;
            $profile->forceFill(['nik_hash' => $row->nik_hash, 'name' => $applicant['name'], 'applicant' => $applicant,
                'updated_by' => $request->user()->id, 'version' => $data['version'] + 1])->save();
            $request->attributes->set('bantuan_actor_role', 'call_center');
            $journal->record($request, $row, 'update_mustahiq', $row->status, ['before' => $before, 'after' => $applicant]);
        });
        return $this->show($request, $id, $access);
    }
}
