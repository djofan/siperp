<?php

namespace App\Modules\Rapat\Http;

use App\Modules\Rapat\Models\Media;
use App\Modules\Rapat\Models\Meeting;
use App\Modules\Rapat\Services\LocalEngine;
use App\Modules\Rapat\Services\RapatData as D;
use App\Modules\Rapat\Services\RapatHistory;
use App\Modules\Rapat\Services\RapatStorage;
use App\Modules\Rapat\Services\RapatWorkflow;
use App\Modules\Rapat\Services\TranscriptionRun;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class RapatController
{
    private function admin(Request $r): bool
    {
        return in_array($r->attributes->get('module_role'), ['admin', 'superadmin'], true);
    }

    private function writer(Request $r): void
    {
        abort_unless($this->admin($r) || $r->attributes->get('module_role') === 'secretary', 403);
    }

    private function query(Request $r)
    {
        return Meeting::query()->when($r->attributes->get('module_role') === 'secretary', fn ($q) => $q->where('created_by', $r->user()->id));
    }

    private function meeting(Request $r, string $id, bool $lock = false): Meeting
    {
        return $this->query($r)->when($lock, fn ($q) => $q->lockForUpdate())->findOrFail($id);
    }

    private function editable(Meeting $m, Request $r, bool $archive = false): void
    {
        RapatWorkflow::assertEditable($m, $r, allowFinalized: $archive, allowArchived: $archive);
    }

    private function response($data, int $status = 200)
    {
        return response()->json(['data' => $data], $status)->header('Cache-Control', 'no-store, private');
    }

    public function retired()
    {
        abort(410, 'Fitur ini telah dihapus. Modul Rapat kini hanya menyediakan rekaman dan transkrip.');
    }

    public function viewer(Request $r)
    {
        return $this->response(['id' => $r->user()->id, 'name' => $r->user()->name, 'role' => $this->admin($r) ? 'admin' : $r->attributes->get('module_role'), 'canManage' => $this->admin($r) || $r->attributes->get('module_role') === 'secretary', 'ai' => Cache::get('rapat.local.health', ['provider' => 'local', 'configured' => false]), 'templates' => collect(D::TEMPLATES)->map(fn ($name, $id) => compact('id', 'name'))->values()->all(), 'institution' => D::institution()]);
    }

    public function aiStatus(LocalEngine $engine)
    {
        return $this->response($engine->health());
    }

    private function filters(Request $r, bool $tasks = false): array
    {
        return $r->validate([
            'q' => 'sometimes|nullable|string|max:255', 'assignee' => 'sometimes|nullable|string|max:255',
            'status' => $tasks ? 'sometimes|in:open,done,overdue,all' : 'sometimes|in:draft,processing,ready,failed',
            'workflowStatus' => 'sometimes|in:draft,finalized',
            'from' => 'sometimes|date_format:Y-m-d', 'to' => 'sometimes|date_format:Y-m-d'.($r->filled('from') ? '|after_or_equal:from' : ''),
            'archived' => $tasks ? 'sometimes|in:0,1,all' : 'sometimes|in:0,1',
            'page' => 'sometimes|integer|min:1|max:100000', 'perPage' => 'sometimes|integer|min:1|max:100',
        ]);
    }

    private function filteredQuery(Request $r, array $f, bool $tasks = false)
    {
        $q = $this->query($r);
        $archived = (string) ($f['archived'] ?? ($tasks ? 'all' : '0'));
        if ($archived === '1') {
            $q->whereNotNull('archived_at');
        } elseif ($archived === '0') {
            $q->whereNull('archived_at');
        }
        if (! $tasks) {
            if (isset($f['status'])) {
                $q->where('status', $f['status']);
            }
            if (isset($f['from'])) {
                $q->whereDate('meeting_date', '>=', $f['from']);
            }
            if (isset($f['to'])) {
                $q->whereDate('meeting_date', '<=', $f['to']);
            }
        }
        abort_if((clone $q)->count() > 5000, 422, 'Persempit filter pencarian (maksimal 5000 rapat).');

        return $q->orderByDesc('meeting_date')->orderBy('id');
    }

    private function pageMeta(int $total, int $page, int $per): array
    {
        return ['total' => $total, 'currentPage' => $page, 'lastPage' => max(1, (int) ceil($total / $per)), 'perPage' => $per];
    }

    public function index(Request $r)
    {
        $f = $this->filters($r);
        $q = $this->filteredQuery($r, $f);
        $per = (int) ($f['perPage'] ?? 25);
        $page = (int) ($f['page'] ?? 1);
        $items = [];
        $stats = ['total' => 0, 'draft' => 0, 'finalized' => 0, 'openActions' => 0, 'overdueActions' => 0, 'ready' => 0, 'processing' => 0, 'failed' => 0];
        $needle = mb_strtolower(trim($f['q'] ?? ''));
        foreach ($q->cursor() as $m) {
            $p = $m->payload;
            $workflow = $p['workflowStatus'] ?? 'draft';
            if (isset($f['workflowStatus']) && $f['workflowStatus'] !== $workflow) {
                continue;
            }
            $hay = implode(' ', [$p['title'], $p['agenda'] ?? '', $p['transcript'] ?? '', '']);
            if ($needle !== '' && ! str_contains(mb_strtolower($hay), $needle)) {
                continue;
            }
            if ($stats['total'] >= ($page - 1) * $per && count($items) < $per) {
                $items[] = D::summary($m);
            }
            $stats['total']++;
            $stats[$workflow]++;
            if (in_array($m->status, ['ready', 'processing', 'failed'], true)) {
                $stats[$m->status]++;
            }
            foreach ($p['minutes']['actions'] ?? [] as $action) {
                if ($action['status'] === 'open') {
                    $stats['openActions']++;
                }
                if (D::overdue($action)) {
                    $stats['overdueActions']++;
                }
            }
        }

        return response()->json(['data' => $items, 'meta' => [...$this->pageMeta($stats['total'], $page, $per), 'stats' => $stats]]);
    }

    public function store(Request $r)
    {
        $this->writer($r);
        abort_if($r->has('minutes'), 410, 'Fitur notulen telah dihapus.');
        $d = D::normalize($r->validate(D::rules(true)));
        $d = [...['template' => 'dinas', 'participants' => [], 'institution' => D::institution()], ...$d];
        $d['meetingDate'] = $d['meetingDate'] ?? now('Asia/Jakarta')->toDateString();
        $d['title'] = trim($d['title'] ?? '') ?: 'Rapat '.now('Asia/Jakarta')->format('d-m-Y H.i');
        $p = ['startTime' => null, 'endTime' => null, 'location' => null, 'agenda' => null, 'chair' => null, 'notetaker' => null, ...$d, 'transcript' => $d['transcript'] ?? '', 'segments' => [], 'minutes' => $d['minutes'] ?? D::minutes(), 'error' => null, 'workflowStatus' => 'draft', 'finalizedAt' => null];

        return DB::transaction(function () use ($r, $d, $p) {
            $m = Meeting::create(['id' => (string) Str::uuid(), 'created_by' => $r->user()->id, 'meeting_date' => $d['meetingDate'], 'payload' => $p, 'version' => 1, 'status' => 'draft']);
            RapatHistory::record($m->refresh(), $r, 'create', null, [...array_keys($d), 'workflowStatus']);

            return $this->response(D::detail($m), 201)->header('Location', url('api/v1/rapat/meetings/'.$m->id));
        });
    }

    public function show(Request $r, string $id)
    {
        return $this->response(D::detail($this->meeting($r, $id)));
    }

    public function update(Request $r, string $id)
    {
        return DB::transaction(function () use ($r, $id) {
            $m = $this->meeting($r, $id, true);
            $this->editable($m, $r);
            $before = RapatHistory::snapshot($m);
            abort_if($r->has('minutes'), 410, 'Fitur notulen telah dihapus.');
            $d = D::normalize($r->validate(D::rules()));
            foreach (['title', 'meetingDate'] as $key) {
                if (array_key_exists($key, $d) && ! trim($d[$key] ?? '')) {
                    unset($d[$key]);
                }
            }
            $original = D::normalize($m->payload);
            $changedFields = array_keys(array_filter($d, fn ($value, $key) => ($original[$key] ?? null) !== $value, ARRAY_FILTER_USE_BOTH));
            $p = [...$m->payload, ...$d];
            if (array_key_exists('transcript', $d) && $d['transcript'] !== ($m->payload['transcript'] ?? '')) {
                $p['segments'] = [];
            }
            $m->payload = $p;
            if (isset($d['meetingDate'])) {
                $m->meeting_date = $d['meetingDate'];
            }
            $m->version++;
            $m->save();
            RapatHistory::record($m, $r, 'update', $before, $changedFields);

            return $this->response(D::detail($m));
        });
    }

    public function archive(Request $r, string $id)
    {
        $r->validate(['archived' => 'required|boolean']);

        return DB::transaction(function () use ($r, $id) {
            $m = $this->meeting($r, $id, true);
            $this->editable($m, $r, true);
            $before = RapatHistory::snapshot($m);
            $m->archived_at = $r->boolean('archived') ? now() : null;
            $m->version++;
            $m->save();
            RapatHistory::record($m, $r, 'archive', $before, ['archivedAt']);

            return $this->response(D::detail($m));
        });
    }

    public function upload(Request $r, string $id)
    {
        $this->writer($r);
        $r->validate(['file' => 'required|file|max:20480', 'clientId' => 'required|uuid', 'sequence' => 'required|integer|min:1|max:500']);
        $f = $r->file('file');
        $ext = strtolower($f->getClientOriginalExtension());
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($f->getRealPath());
        $types = ['wav' => ['audio/x-wav', 'audio/wav', 'audio/vnd.wave'], 'mp3' => ['audio/mpeg', 'audio/mp3'], 'm4a' => ['audio/mp4', 'audio/x-m4a', 'video/mp4'], 'mp4' => ['audio/mp4', 'video/mp4'], 'ogg' => ['audio/ogg', 'application/ogg'], 'webm' => ['audio/webm', 'video/webm'], 'flac' => ['audio/flac', 'audio/x-flac']];
        abort_unless(isset($types[$ext]) && in_array($mime, $types[$ext], true), 422, 'Format audio tidak didukung.');
        $bytes = file_get_contents($f->getRealPath());
        $hash = hash('sha256', $bytes);

        return DB::transaction(function () use ($r, $id, $f, $mime, $bytes, $hash, $ext) {
            $m = $this->meeting($r, $id, true);
            abort_if($m->status === 'processing' || $m->archived_at || ($m->payload['workflowStatus'] ?? 'draft') === 'finalized', 409);
            $old = Media::withTrashed()->where('meeting_id', $id)->where('client_id', strtolower($r->input('clientId')))->first();
            if ($old) {
                abort_if($old->trashed() || $old->sequence !== (int) $r->input('sequence') || ($old->payload['hash'] ?? null) !== $hash, 409, 'clientId sudah digunakan.');

                return $this->response(D::media($old), 201);
            }
            abort_if(Media::where('meeting_id', $id)->count() >= 500 || Media::where('meeting_id', $id)->where('sequence', $r->input('sequence'))->exists(), 409, 'Urutan audio sudah digunakan atau batas tercapai.');
            $mid = (string) Str::uuid();
            $path = 'rapat/media/'.$mid.'.enc';
            abort_unless(RapatStorage::put($path, Crypt::encryptString($bytes)), 503, 'Penyimpanan privat tidak tersedia.');
            try {
                $media = Media::create(['id' => $mid, 'meeting_id' => $id, 'client_id' => strtolower($r->input('clientId')), 'sequence' => (int) $r->input('sequence'), 'mime' => $mime, 'size' => strlen($bytes), 'path' => $path, 'payload' => ['name' => mb_substr(basename(str_replace('\\', '/', $f->getClientOriginalName())), 0, 255), 'hash' => $hash, 'extension' => $ext]]);
                $m->version++;
                $m->save();
            } catch (\Throwable $e) {
                Storage::disk('local')->delete($path);
                throw $e;
            }

            return $this->response(D::media($media), 201);
        });
    }

    public function removeMedia(Request $r, string $id)
    {
        $media = Media::findOrFail($id);

        return DB::transaction(function () use ($r, $media) {
            $m = $this->meeting($r, $media->meeting_id, true);
            $this->editable($m, $r);
            $media->delete();
            $m->version++;
            $m->save();

            return response()->noContent();
        });
    }

    public function play(Request $r, string $id)
    {
        $media = Media::findOrFail($id);
        $this->meeting($r, $media->meeting_id);
        $bytes = Crypt::decryptString(Storage::disk('local')->get($media->path));

        return response($bytes)->header('Content-Type', $media->mime)->header('Content-Disposition', 'inline; filename="audio.'.$media->payload['extension'].'"')->header('Cache-Control', 'no-store, private');
    }

    public function transcribe(Request $r, string $id, LocalEngine $engine)
    {
        $this->writer($r);
        $r->validate(['version' => 'required|integer|min:1']);
        $this->editable($this->meeting($r, $id), $r);
        $health = $engine->health();
        abort_unless($health['transcriberReady'] ?? $health['configured'] ?? false, 503, 'Mesin transkripsi lokal belum siap.');

        return DB::transaction(function () use ($r, $id) {
            $m = $this->meeting($r, $id, true);
            $this->editable($m, $r);
            abort_unless(Media::where('meeting_id', $id)->exists(), 422, 'Rekam atau unggah audio terlebih dahulu.');
            if ($m->status === 'ready') {
                foreach (Media::where('meeting_id', $id)->get() as $media) {
                    $cached = $media->payload;
                    unset($cached['checkpoint']);
                    $media->payload = $cached;
                    $media->transcribed = false;
                    $media->save();
                }
            }
            $token = (string) Str::uuid();
            $m->run_token = $token;
            $m->run_started_at = null;
            $m->status = 'processing';
            $m->version++;
            $p = $m->payload;
            $p['error'] = null;
            $p['processingMode'] = 'transcribe';
            $p['transcriptionState'] = TranscriptionRun::initial();
            $m->payload = $p;
            $m->save();
            TranscriptionRun::enqueue($m);

            return $this->response(D::detail($m), 202);
        });
    }
}
