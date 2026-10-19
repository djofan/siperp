<?php

namespace App\Modules\Sarsip\Http\Controllers;

use App\Modules\Payment\Models\PaymentTransaction;
use App\Modules\Sarsip\Models\SarsipBeneficiary;
use App\Modules\Sarsip\Models\SarsipEntry;
use App\Modules\Sarsip\Models\SarsipPaymentMethod;
use App\Modules\Sarsip\Models\SarsipProfile;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ContentController
{
    public function profile(): JsonResponse
    {
        return response()->json(['data' => SarsipProfile::find('main') ?? ['id' => 'main', 'headline' => 'Bersama hadir, saat bantuan dibutuhkan.', 'description' => 'Tim SAR Solidaritas Insan Peduli. Pencarian, pertolongan, dan bantuan kemanusiaan untuk sesama.', 'contact' => null]]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $data = $request->validate(['headline' => 'required|string|max:191', 'description' => 'required|string|max:10000', 'contact' => 'sometimes|nullable|string|max:191']);
        $row = SarsipProfile::find('main') ?? new SarsipProfile;
        $row->forceFill(['id' => 'main', ...$data])->save();

        return response()->json(['ok' => true]);
    }

    private function entriesQuery(Request $request)
    {
        $input = $request->validate(['kind' => 'sometimes|in:kegiatan,campaign,berita']);
        $query = SarsipEntry::whereIn('kind', ['kegiatan', 'campaign', 'berita']);
        if (isset($input['kind'])) {
            $query->where('kind', $input['kind']);
        }
        if (! $request->route('admin')) {
            $query->whereIn('status', ['published', 'completed']);
        }

        return $query;
    }

    private function entryData(SarsipEntry $row): array
    {
        return [...$row->toArray(), 'currentAmount' => (int) PaymentTransaction::where('module_source', 'sarsip')->where('source_type', 'campaign')->where('source_id', $row->id)->where('status', 'paid')->sum('amount')];
    }

    public function entries(Request $request): JsonResponse
    {
        $request->validate(['page' => 'sometimes|integer|min:1', 'per_page' => 'sometimes|integer|min:1|max:100']);
        $page = $this->entriesQuery($request)->orderByDesc('created_at')->orderBy('id')->paginate($request->integer('per_page', 100));
        $page->through(fn ($row) => $this->entryData($row));

        return response()->json($page);
    }

    public function entry(Request $request, string $id): JsonResponse
    {
        return response()->json(['data' => $this->entryData($this->entriesQuery($request)->findOrFail($id))]);
    }

    private function entryInput(Request $request, ?SarsipEntry $row = null): array
    {
        if ($row) {
            $request->merge(['kind' => $row->kind]);
        }
        $data = $request->validate(['kind' => 'required|in:kegiatan,campaign,berita', 'title' => 'required|string|max:191', 'description' => 'required|string|max:50000', 'status' => 'required|in:draft,published,completed,archived', 'location' => 'sometimes|nullable|string|max:191', 'image' => 'sometimes|nullable|string|max:191', 'eventDate' => 'sometimes|nullable|date', 'targetAmount' => 'required_if:kind,campaign|integer|min:0|max:2147483647']);
        $data['targetAmount'] = $data['kind'] === 'campaign' ? ($data['targetAmount'] ?? 0) : 0;
        if ($data['kind'] === 'campaign' && $data['targetAmount'] <= 0) {
            throw ValidationException::withMessages(['targetAmount' => 'Target campaign harus lebih dari Rp0.']);
        }
        if (! empty($data['image']) && ! preg_match('~^(https?://|/uploads/sarsip/[a-f0-9-]{36}\.(jpg|png|webp)$)~', $data['image'])) {
            throw ValidationException::withMessages(['image' => 'Gambar tidak valid.']);
        }

        return $data;
    }

    public function storeEntry(Request $request): JsonResponse
    {
        $row = new SarsipEntry;
        $row->forceFill($this->entryInput($request))->save();

        return response()->json(['id' => $row->id, 'data' => $this->entryData($row->refresh())], 201)->header('Location', $request->url().'/'.$row->id);
    }

    public function updateEntry(Request $request, string $id): JsonResponse
    {
        $row = SarsipEntry::findOrFail($id);
        $row->forceFill($this->entryInput($request, $row))->save();

        return response()->json(['ok' => true]);
    }

    public function archiveEntry(string $id): JsonResponse
    {
        $row = SarsipEntry::findOrFail($id);
        $row->status = 'archived';
        $row->save();

        return response()->json(['ok' => true]);
    }

    public function donations(Request $request, string $id): JsonResponse
    {
        SarsipEntry::where('kind', 'campaign')->whereIn('status', ['published', 'completed'])->findOrFail($id);
        $request->validate(['page' => 'sometimes|integer|min:1', 'per_page' => 'sometimes|integer|min:1|max:100']);
        $page = PaymentTransaction::with('donor:id,name')->where('module_source', 'sarsip')->where('source_type', 'campaign')->where('source_id', $id)->where('status', 'paid')->orderByDesc('created_at')->orderBy('id')->paginate($request->integer('per_page', 100));
        $page->through(fn ($row) => ['id' => $row->id, 'amount' => $row->amount, 'name' => $row->isAnonymous ? 'Hamba Allah' : $row->donor->name]);

        return response()->json($page);
    }

    public function transactions(Request $request): JsonResponse
    {
        $request->validate(['page' => 'sometimes|integer|min:1', 'per_page' => 'sometimes|integer|min:1|max:100']);

        return response()->json(PaymentTransaction::with('donor:id,name,phone')->where('module_source', 'sarsip')->orderByDesc('created_at')->orderBy('id')->paginate($request->integer('per_page', 100)));
    }

    public function beneficiaries(Request $request): JsonResponse
    {
        $request->validate(['page' => 'sometimes|integer|min:1', 'per_page' => 'sometimes|integer|min:1|max:100']);
        $query = SarsipBeneficiary::whereNull('archived_at');
        if (! $request->route('admin')) {
            $query->where('is_published', true)->select(['id', 'public_name', 'category', 'amount', 'image', 'received_at']);
        }
        $page = $query->orderByDesc('received_at')->orderBy('id')->paginate($request->integer('per_page', 100));
        if (! $request->route('admin')) {
            $page->through(fn ($row) => ['id' => $row->id, 'publicName' => $row->publicName, 'category' => $row->category, 'amount' => $row->amount, 'image' => $row->image]);
        }

        return response()->json($page);
    }

    public function beneficiary(string $id): JsonResponse
    {
        return response()->json(['data' => SarsipBeneficiary::whereNull('archived_at')->findOrFail($id)]);
    }

    private function beneficiaryInput(Request $request): array
    {
        $today = now('Asia/Jakarta')->format('Y-m-d');
        $data = $request->validate(['name' => 'required|string|max:191', 'location' => 'required|string|max:191', 'assistance' => 'required|string|max:191', 'phone' => ['sometimes', 'nullable', 'string', 'regex:/^\+?[0-9 ()-]{6,25}$/D'], 'notes' => 'sometimes|nullable|string|max:5000', 'receivedAt' => 'required|date_format:Y-m-d|before_or_equal:'.$today, 'publicName' => 'required_if:isPublished,true|nullable|string|max:191', 'category' => 'sometimes|in:Evakuasi,Kebutuhan Pokok,Kesehatan,Pemulihan,Lainnya', 'amount' => 'sometimes|integer|min:0|max:2147483647', 'image' => ['sometimes', 'nullable', 'string', 'regex:~^(?:/uploads/sarsip/[a-f0-9-]{36}\.(?:jpg|png|webp)|https?://[^\s]+)$~i'], 'isPublished' => 'required|boolean']);
        $data['receivedAt'] = CarbonImmutable::createFromFormat('!Y-m-d', $data['receivedAt'], 'Asia/Jakarta')->utc();

        return $data;
    }

    public function storeBeneficiary(Request $request): JsonResponse
    {
        $row = new SarsipBeneficiary;
        $row->forceFill($this->beneficiaryInput($request))->save();

        return response()->json(['id' => $row->id, 'data' => $row->refresh()], 201)->header('Location', $request->url().'/'.$row->id);
    }

    public function updateBeneficiary(Request $request, string $id): JsonResponse
    {
        $row = SarsipBeneficiary::whereNull('archived_at')->findOrFail($id);
        $row->forceFill($this->beneficiaryInput($request))->save();

        return response()->json(['ok' => true]);
    }

    public function archiveBeneficiary(string $id): JsonResponse
    {
        $row = SarsipBeneficiary::whereNull('archived_at')->findOrFail($id);
        $row->archivedAt = now();
        $row->save();

        return response()->json(['ok' => true]);
    }

    public function transparency(): JsonResponse
    {
        $query = PaymentTransaction::where('module_source', 'sarsip')->where('source_type', 'campaign')->where('status', 'paid');

        return response()->json(['data' => ['totalAmount' => (int) (clone $query)->sum('amount'), 'donorCount' => (clone $query)->distinct()->count('donor_id'), 'beneficiaryCount' => SarsipBeneficiary::whereNull('archived_at')->count()]]);
    }

    public function paymentMethods(): JsonResponse
    {
        $data = config('payment.gateway') === 'midtrans_sandbox'
            ? [['id' => 'midtrans-sandbox', 'method' => 'Midtrans Sandbox', 'feeAmount' => 0, 'feePercentage' => 0]]
            : SarsipPaymentMethod::orderBy('method')->get();

        return response()->json(['data' => $data]);
    }
}
