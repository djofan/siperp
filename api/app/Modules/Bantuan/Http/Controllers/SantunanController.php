<?php

namespace App\Modules\Bantuan\Http\Controllers;

use App\Modules\Bantuan\Models\Santunan;
use App\Modules\Bantuan\Services\Access;
use App\Modules\Bantuan\Services\Attachment;
use App\Modules\Bantuan\Services\PhotoLocation;
use App\Modules\Bantuan\Services\SantunanPrograms;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SantunanController
{
    public function index(Request $request, Access $access)
    {
        $access->allow($request, ['treasurer', 'volunteer', 'verifier', 'chair']);
        $filters = $request->validate([
            'frequency' => 'nullable|in:routine,non_routine',
            'period' => 'nullable|date_format:Y-m',
            'transferStatus' => 'nullable|in:pending,transferred',
            'distributionStatus' => 'nullable|in:process,completed',
        ]);
        $query = Santunan::query()->latest('period')->latest('created_at');
        if (! $access->has($request, ['admin', 'treasurer', 'chair'])) {
            $query->where(fn ($scope) => $scope->where('volunteer_id', $request->user()->id)->orWhere('companion_id', $request->user()->id));
        }
        if (! empty($filters['period'])) {
            $query->whereDate('period', $filters['period'].'-01');
        }
        foreach (['frequency', 'transferStatus', 'distributionStatus'] as $key) {
            if (! empty($filters[$key])) {
                $query->where(Str::snake($key), $filters[$key]);
            }
        }

        return response()->json(['data' => $query->get()->map(fn (Santunan $row) => $this->payload($row))])->header('Cache-Control', 'no-store, private');
    }

    public function store(Request $request, Access $access)
    {
        $access->allow($request, ['treasurer']);
        $data = $request->validate([
            'frequency' => 'required|in:routine,non_routine',
            'category' => ['required', Rule::in(SantunanPrograms::CATEGORIES)],
            'period' => 'required|date_format:Y-m',
            'recipientName' => 'required|string|max:191',
            'volunteerId' => 'required|string|max:191',
            'amount' => 'required|integer|min:1|max:9000000000000',
        ]);
        abort_unless(SantunanPrograms::supports($data['frequency'], $data['category']), 422, 'Program tidak mendukung jenis santunan ini.');
        abort_unless($access->assigned($data['volunteerId'], 'volunteer'), 422, 'Pilih penyalur yang aktif.');

        $row = new Santunan;
        $row->forceFill([
            'id' => (string) Str::uuid(),
            'number' => $this->nextNumber(),
            'frequency' => $data['frequency'],
            'category' => $data['category'],
            'period' => $data['period'].'-01',
            'recipient' => ['name' => $data['recipientName']],
            'volunteer_id' => $data['volunteerId'],
            'amount' => $data['amount'],
            'transfer_status' => 'pending',
            'distribution_status' => 'process',
            'version' => 1,
        ])->save();
        $this->event($request, $access, $row, 'created');

        return response()->json(['data' => $this->payload($row)], 201);
    }

    public function import(Request $request, Access $access)
    {
        $access->allow($request, ['treasurer']);
        $data = $request->validate([
            'period' => 'required|date_format:Y-m',
            'volunteerId' => 'sometimes|required|string|max:191',
            'rows' => 'required|array|list|min:1|max:200',
            'rows.*' => 'required|array:recipientName,category,frequency,amount,verifierName,verifierId',
            'rows.*.frequency' => 'sometimes|required|in:routine,non_routine',
            'rows.*.verifierId' => 'sometimes|required|string|max:191',
            'rows.*.recipientName' => 'required|string|max:191',
            'rows.*.category' => ['required', Rule::in(SantunanPrograms::CATEGORIES)],
            'rows.*.verifierName' => 'sometimes|required|string|max:191',
            'rows.*.amount' => 'required|integer|min:1|max:9000000000000',
        ]);
        if (isset($data['volunteerId'])) {
            abort_unless($access->assigned($data['volunteerId'], 'volunteer'), 422, 'Pilih penyalur yang aktif.');
        }

        return DB::transaction(function () use ($request, $access, $data) {
            DB::table('modules')->where('slug', 'bantuan')->lockForUpdate()->firstOrFail();
            $people = DB::table('module_access')->join('modules', 'modules.id', '=', 'module_access.module_id')
                ->join('users', 'users.id', '=', 'module_access.user_id')
                ->leftJoin('bantuan_staff', 'bantuan_staff.user_id', '=', 'users.id')
                ->where('modules.slug', 'bantuan')->where('users.is_active', true)
                ->get(['users.id', 'users.name', 'module_access.role', 'bantuan_staff.roles']);
            $normalize = fn (string $name) => mb_strtolower(preg_replace('/\s+/u', ' ', trim($name)));
            $seen = [];
            $existing = Santunan::whereDate('period', $data['period'].'-01')->get();
            foreach ($existing as $row) {
                $seen[$row->frequency.':'.$row->category.':'.$normalize($row->recipient['name'])] = true;
            }
            foreach ($data['rows'] as $index => $item) {
                $volunteerId = $data['volunteerId'] ?? null;
                $frequency = $item['frequency'] ?? 'routine';
                if (! SantunanPrograms::supports($frequency, $item['category'])) {
                    throw ValidationException::withMessages(['rows.'.$index.'.category' => 'Program tidak mendukung jenis santunan ini.']);
                }
                if (isset($item['verifierId'])) {
                    abort_unless($access->assigned($item['verifierId'], 'volunteer'), 422, 'Verifikator/penyalur pilihan tidak aktif atau tidak memiliki peran Penyalur.');
                    $volunteerId = $item['verifierId'];
                } elseif (isset($item['verifierName'])) {
                    $matches = $people->filter(fn ($person) => in_array('volunteer', Access::expandRoles($person->role, $person->roles), true)
                        && $normalize($person->name) === $normalize($item['verifierName']));
                    if ($matches->count() !== 1) {
                        throw ValidationException::withMessages([
                            'rows.'.$index.'.verifierName' => 'Baris data '.($index + 1).': nama verifikator tidak cocok dengan satu penyalur aktif. Pilih nama unik dari daftar.',
                        ]);
                    }
                    $volunteerId = $matches->first()->id;
                }
                if (! $volunteerId) {
                    throw ValidationException::withMessages(['rows.'.$index.'.verifierName' => 'Pilih verifikator/penyalur untuk baris ini.']);
                }
                $name = trim($item['recipientName']);
                $key = $frequency.':'.$item['category'].':'.$normalize($name);
                if ($name === '' || isset($seen[$key])) {
                    throw ValidationException::withMessages([
                        'rows.'.$index.'.recipientName' => 'Baris data '.($index + 1).': nama kosong atau penerima sudah ada pada program dan periode ini.',
                    ]);
                }
                $seen[$key] = true;
                $row = new Santunan;
                $row->forceFill([
                    'id' => (string) Str::uuid(), 'number' => $this->nextNumber(),
                    'frequency' => $frequency, 'category' => $item['category'],
                    'period' => $data['period'].'-01', 'recipient' => ['name' => $name],
                    'volunteer_id' => $volunteerId, 'amount' => $item['amount'],
                    'transfer_status' => 'pending', 'distribution_status' => 'process', 'version' => 1,
                ])->save();
                $this->event($request, $access, $row, 'created', ['source' => 'excel_import', 'verifierName' => $item['verifierName'] ?? null, 'volunteerId' => $volunteerId]);
            }

            return (new JsonResource([
                'createdCount' => count($data['rows']),
            ]))->response()->header('Cache-Control', 'no-store, private');
        });
    }

    public function nextPeriod(Request $request, Access $access)
    {
        $access->allow($request, ['treasurer']);
        $data = $request->validate(['sourcePeriod' => 'required|date_format:Y-m']);
        $sourceDate = CarbonImmutable::createFromFormat('!Y-m', $data['sourcePeriod']);
        $targetDate = $sourceDate->addMonth();

        return DB::transaction(function () use ($request, $access, $sourceDate, $targetDate) {
            // Serialize period creation, including retries from another administrator.
            DB::table('modules')->where('slug', 'bantuan')->lockForUpdate()->firstOrFail();
            abort_if(Santunan::where('frequency', 'routine')->whereDate('period', $targetDate->toDateString())->exists(),
                409, 'Santunan rutin untuk bulan tujuan sudah ada. Daftar tidak disalin lagi agar tidak ganda.');
            $sources = Santunan::where('frequency', 'routine')->whereDate('period', $sourceDate->toDateString())->orderBy('id')->lockForUpdate()->get();
            abort_if($sources->isEmpty(), 422, 'Tidak ada santunan rutin pada periode sumber.');
            foreach ($sources as $source) {
                abort_unless($access->assigned($source->volunteer_id, 'volunteer'),
                    422, 'Ada penyalur yang tidak aktif atau tidak lagi memiliki akses. Periksa tim sebelum membuat periode baru.');
                $row = new Santunan;
                $row->forceFill([
                    'id' => (string) Str::uuid(), 'number' => $this->nextNumber(),
                    'frequency' => 'routine', 'category' => $source->category,
                    'period' => $targetDate->toDateString(), 'recipient' => $source->recipient,
                    'volunteer_id' => $source->volunteer_id, 'amount' => $source->amount,
                    'transfer_status' => 'pending', 'distribution_status' => 'process', 'version' => 1,
                ])->save();
                $this->event($request, $access, $row, 'created', ['sourceId' => $source->id, 'sourcePeriod' => $sourceDate->format('Y-m')]);
            }

            return (new JsonResource([
                'period' => $targetDate->format('Y-m'), 'createdCount' => $sources->count(),
            ]))->response()->setStatusCode(201)->header('Location', url('/api/v1/bantuan/santunan?period='.$targetDate->format('Y-m')));
        });
    }

    public function companion(Request $request, string $id, Access $access)
    {
        $access->allow($request, ['treasurer']);
        abort_if(array_diff(array_keys($request->all()), ['version', 'companionId']), 422, 'Field pendamping tidak valid.');
        $data = $request->validate(['version' => 'required|integer|min:1', 'companionId' => 'present|nullable|string|max:191']);

        return DB::transaction(function () use ($request, $id, $access, $data) {
            $row = Santunan::lockForUpdate()->findOrFail($id);
            abort_if($row->distribution_status === 'completed', 409, 'Laporan sudah selesai; pendamping tidak dapat diubah.');
            abort_unless($row->version === (int) $data['version'], 409, 'Data berubah. Muat ulang halaman lalu coba lagi.');
            $person = $data['companionId'];
            abort_if($person === $row->volunteer_id, 422, 'Penyalur utama tidak perlu ditambahkan sebagai pendamping.');
            if ($person !== null) {
                abort_unless($access->assigned($person, 'verifier') || $access->assigned($person, 'volunteer'), 422, 'Pilih verifikator atau penyalur aktif sebagai pendamping.');
            }
            $previous = $row->companion_id;
            $row->forceFill(['companion_id' => $person, 'version' => $row->version + 1])->save();
            $this->event($request, $access, $row, 'companion_changed', ['previousId' => $previous, 'companionId' => $person]);

            return (new JsonResource($this->payload($row)))->response()->header('Cache-Control', 'no-store, private');
        });
    }

    private function allowReport(Request $request, Access $access, Santunan $row): void
    {
        $roles = $row->volunteer_id === $request->user()->id ? ['volunteer'] : [];
        if ($row->companion_id === $request->user()->id) {
            $roles = [...$roles, 'verifier', 'volunteer'];
        }
        $access->allow($request, $roles);
    }

    public function transferred(Request $request, string $id, Access $access)
    {
        $access->allow($request, ['treasurer']);

        return DB::transaction(function () use ($request, $id, $access) {
            $row = Santunan::lockForUpdate()->findOrFail($id);
            abort_if($row->transfer_status === 'transferred', 409, 'Santunan sudah ditandai ditransfer.');
            $data = $request->validate(['version' => 'required|integer', 'transferredAt' => 'required|date|before_or_equal:today']);
            abort_unless((int) $data['version'] === $row->version, 409, 'Data berubah. Muat ulang halaman lalu coba lagi.');
            $row->forceFill(['transfer_status' => 'transferred', 'transferred_at' => $data['transferredAt'],
                'transferred_by' => $request->user()->id, 'version' => $row->version + 1])->save();
            $this->event($request, $access, $row, 'transferred', ['transferredAt' => $data['transferredAt']]);

            return response()->json(['data' => $this->payload($row)]);
        });
    }

    public function document(Request $request, string $id, Access $access)
    {
        $row = $this->find($request, $access, $id, true);
        abort_unless($row->transfer_status === 'transferred' && $row->distribution_status === 'process', 409, 'Bukti hanya dapat diunggah setelah dana ditransfer dan sebelum laporan selesai.');
        $data = $request->validate(['kind' => 'required|in:aid_paper,recipient_photo,transfer_receipt', 'file' => Attachment::RULES]);
        $photoLocation = PhotoLocation::fromRequest($request);
        $this->allowReport($request, $access, $row);

        return DB::transaction(function () use ($request, $row, $data, $access, $photoLocation) {
            $row = $this->find($request, $access, $row->id, true);
            $this->allowReport($request, $access, $row);
            abort_unless($row->transfer_status === 'transferred' && $row->distribution_status === 'process', 409, 'Santunan tidak lagi menerima bukti.');
            abort_if(DB::table('bantuan_santunan_documents')->where('santunan_id', $row->id)->where('kind', $data['kind'])->exists(), 422, 'Foto untuk jenis bukti ini sudah tersedia.');
            $documentId = (string) Str::uuid();
            $path = 'bantuan/santunan/'.$row->id.'/'.$documentId.'.enc';
            abort_unless(Storage::disk('local')->put($path, Crypt::encryptString(file_get_contents($data['file']->getRealPath()))), 503, 'Penyimpanan dokumen gagal.');
            DB::table('bantuan_santunan_documents')->insert(['id' => $documentId, 'santunan_id' => $row->id, 'kind' => $data['kind'],
                'photo_location' => $photoLocation, 'path' => $path, 'mime' => $data['file']->getMimeType(), 'uploaded_by' => $request->user()->id, 'created_at' => now()]);
            $this->event($request, $access, $row, 'document_uploaded', ['kind' => $data['kind']]);

            return response()->json(['data' => ['id' => $documentId, 'kind' => $data['kind']]], 201);
        });
    }

    public function complete(Request $request, string $id, Access $access)
    {
        return DB::transaction(function () use ($request, $id, $access) {
            $row = $this->find($request, $access, $id, true);
            $this->allowReport($request, $access, $row);
            abort_unless($row->transfer_status === 'transferred', 409, 'Dana belum ditandai sudah ditransfer.');
            abort_if($row->distribution_status === 'completed', 409, 'Santunan sudah selesai dilaporkan.');
            $data = $request->validate([
                'version' => 'required|integer',
                'distributionDate' => 'required|date|before_or_equal:today',
                'location' => 'required|string|max:500',
                'recipient' => 'required|string|max:191',
                'description' => 'required|string|min:5|max:5000',
            ]);
            abort_unless((int) $data['version'] === $row->version, 409, 'Data berubah. Muat ulang halaman lalu coba lagi.');
            foreach (['aid_paper', 'recipient_photo'] as $kind) {
                abort_unless(DB::table('bantuan_santunan_documents')->where('santunan_id', $row->id)->where('kind', $kind)->exists(), 422, 'Dua foto bukti wajib dilengkapi sebelum status menjadi Sudah.');
            }
            $row->forceFill(['distribution_status' => 'completed', 'report' => $data, 'completed_at' => $data['distributionDate'],
                'completed_by' => $request->user()->id, 'version' => $row->version + 1])->save();
            $this->event($request, $access, $row, 'completed', $data);

            return response()->json(['data' => $this->payload($row)]);
        });
    }

    public function download(Request $request, string $documentId, Access $access)
    {
        $document = DB::table('bantuan_santunan_documents')->where('id', $documentId)->firstOrFail();
        $this->find($request, $access, $document->santunan_id);
        $bytes = Crypt::decryptString(Storage::disk('local')->get($document->path));

        return response($bytes, 200, Attachment::headers($document->mime, $document->id));
    }

    private function find(Request $request, Access $access, string $id, bool $lock = false): Santunan
    {
        $access->allow($request, ['treasurer', 'volunteer', 'verifier', 'chair']);
        $query = Santunan::query();
        if (! $access->has($request, ['admin', 'treasurer', 'chair'])) {
            $query->where(fn ($scope) => $scope->where('volunteer_id', $request->user()->id)->orWhere('companion_id', $request->user()->id));
        }
        $row = ($lock ? $query->lockForUpdate() : $query)->findOrFail($id);

        return $row;
    }

    private function payload(Santunan $row): array
    {
        $documents = DB::table('bantuan_santunan_documents')->where('santunan_id', $row->id)->get(['id', 'kind', 'mime', 'created_at', 'photo_location'])->map(function ($doc) {
            $doc->location = PhotoLocation::present($doc->photo_location);
            unset($doc->photo_location);

            return $doc;
        });

        return ['id' => $row->id, 'number' => $row->number, 'frequency' => $row->frequency, 'category' => $row->category,
            'period' => $row->period->format('Y-m'), 'recipientName' => $row->recipient['name'], 'volunteerId' => $row->volunteer_id, 'companionId' => $row->companion_id,
            'amount' => $row->amount, 'transferStatus' => $row->transfer_status, 'distributionStatus' => $row->distribution_status,
            'transferredAt' => $row->transferred_at?->toDateString(), 'report' => $row->report,
            'completedAt' => $row->completed_at?->toDateString(), 'version' => $row->version, 'documents' => $documents];
    }

    private function nextNumber(): string
    {
        return 'STN-'.now()->format('Ym').'-'.str_pad((string) (Santunan::whereYear('created_at', now()->year)->count() + 1), 4, '0', STR_PAD_LEFT);
    }

    private function event(Request $request, Access $access, Santunan $row, string $action, array $details = []): void
    {
        DB::table('bantuan_santunan_events')->insert(['id' => (string) Str::uuid(), 'santunan_id' => $row->id,
            'actor_id' => $request->user()->id, 'actor_role' => $access->role($request), 'action' => $action,
            'details' => Crypt::encryptString(json_encode($details, JSON_THROW_ON_ERROR)), 'created_at' => now()]);
    }
}
