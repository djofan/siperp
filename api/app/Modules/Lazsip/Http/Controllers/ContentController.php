<?php

namespace App\Modules\Lazsip\Http\Controllers;

use App\Modules\Lazsip\Models\LazsipActivity;
use App\Modules\Lazsip\Models\LazsipBeneficiary;
use App\Modules\Lazsip\Models\LazsipNews;
use App\Modules\Lazsip\Models\LazsipPartner;
use App\Modules\Lazsip\Models\LazsipPaymentFeeRef;
use App\Modules\Lazsip\Models\LazsipProgram;
use App\Modules\Lazsip\Models\LazsipProgramApplicant;
use App\Modules\Lazsip\Models\LazsipSiteContent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ContentController
{
    private const MODELS = ['news' => LazsipNews::class, 'programs' => LazsipProgram::class, 'partners' => LazsipPartner::class, 'activities' => LazsipActivity::class, 'beneficiaries' => LazsipBeneficiary::class, 'payment-fees' => LazsipPaymentFeeRef::class];

    private const PUBLIC_CARD = ['id', 'name', 'age', 'amount_received', 'aid_type', 'photo', 'is_pinned', 'verifier_area', 'verifier_name'];

    private const PUBLIC_DETAIL = ['id', 'name', 'age', 'problem_faced', 'gender', 'photo', 'handover_photo', 'certificate_photo', 'referral_source', 'needs', 'aid_type', 'amount_received', 'verifier_name', 'verifier_area'];

    private function query(Request $request, bool $detail = false)
    {
        $resource = $request->route('resource');
        $model = self::MODELS[$resource] ?? abort(404);
        $query = $model::query();
        if ($resource === 'news' && ! $request->route('admin')) {
            $query->where('status', 'published');
        }
        if ($resource === 'programs') {
            $data = $request->validate(['type' => 'sometimes|in:berita,daftar']);
            if (isset($data['type'])) {
                $query->where('type', $data['type']);
            }
        }
        if ($resource === 'beneficiaries' && ! $request->route('admin')) {
            $query->select($detail ? self::PUBLIC_DETAIL : [...self::PUBLIC_CARD, 'created_at']);
            $data = $request->validate(['aidType' => 'sometimes|in:pendidikan,kesehatan,kebutuhan_pokok,lainnya', 'verifierName' => 'sometimes|string|max:191']);
            if (isset($data['aidType'])) {
                $query->where('aid_type', $data['aidType']);
            }
            if (isset($data['verifierName'])) {
                $query->where('verifier_name', $data['verifierName']);
            }
        }

        return $query;
    }

    public function index(Request $request): JsonResponse
    {
        $request->validate(['page' => 'sometimes|integer|min:1', 'per_page' => 'sometimes|integer|min:1|max:100']);
        $query = $this->query($request);
        $resource = $request->route('resource');
        if (in_array($resource, ['programs', 'activities'], true) || ($resource === 'news' && ! $request->route('admin'))) {
            $query->orderByDesc('is_pinned');
        }
        if ($resource === 'activities') {
            $query->orderByDesc('date');
        } elseif ($resource === 'partners') {
            $query->orderBy('name');
        } elseif ($resource === 'payment-fees') {
            $query->orderBy('method');
        } else {
            $query->orderByDesc('created_at');
        }
        $page = $query->orderBy('id')->paginate($request->integer('per_page', 100));
        if ($resource === 'beneficiaries' && ! $request->route('admin')) {
            $page->through(function ($row) {
                $data = $row->toArray();
                unset($data['createdAt']);

                return $data;
            });
        }

        return response()->json($page);
    }

    public function show(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->query($request, true)->findOrFail($request->route('id'))]);
    }

    private function input(Request $request): array
    {
        $image = 'sometimes|nullable|string|max:191';
        $title = 'required|string|max:191';
        $text = 'required|string|max:1000000';
        $rules = match ($request->route('resource')) {
            'news' => ['title' => $title, 'content' => $text, 'image' => $image, 'isPinned' => 'required|boolean', 'status' => 'required|in:draft,published'],
            'activities' => ['title' => $title, 'description' => $text, 'image' => $image, 'date' => 'required|date', 'isPinned' => 'required|boolean'],
            'partners' => ['name' => $title, 'logo' => $image, 'url' => 'sometimes|nullable|url:http,https|max:191'],
            'programs' => ['title' => $title, 'description' => $text, 'requirements' => 'sometimes|nullable|string|max:1000000', 'image' => $image, 'category' => 'sometimes|in:umum,pendidikan,sarsip', 'type' => 'required|in:berita,daftar', 'formUrl' => 'required_if:type,daftar|nullable|url:http,https|max:191', 'isPinned' => 'required|boolean'],
            'payment-fees' => ['method' => $title, 'feeAmount' => 'sometimes|nullable|integer|min:0|max:2147483647', 'feePercentage' => 'sometimes|nullable|numeric|min:0|max:100'],
            default => abort(404),
            'beneficiaries' => ['name' => $title, 'address' => $text, 'problemFaced' => $text, 'birthDate' => 'required|date|before_or_equal:today', 'age' => 'required|integer|min:0|max:150', 'gender' => $title, 'referralSource' => $title, 'photo' => $image, 'needs' => $text, 'aidType' => 'required|in:pendidikan,kesehatan,kebutuhan_pokok,lainnya', 'amountReceived' => 'required|integer|min:0|max:2147483647', 'verifierName' => $title, 'verifierArea' => $title, 'maritalStatus' => 'required|in:menikah,janda-cerai,janda-meninggal,duda-cerai,duda-meninggal', 'nik' => 'sometimes|nullable|string|max:191', 'occupation' => 'sometimes|nullable|string|max:191', 'monthlyIncome' => 'sometimes|nullable|integer|min:0|max:2147483647', 'dependentsCount' => 'sometimes|nullable|integer|min:0|max:2147483647', 'dependentsDetail' => 'sometimes|nullable|string|max:1000000', 'isPinned' => 'required|boolean'],
        };
        if ($request->route('resource') === 'beneficiaries') {
            $rules['handoverPhoto'] = $image;
            $rules['certificatePhoto'] = $image;
        }
        if (in_array($request->route('resource'), ['activities', 'programs'], true)) {
            $rules = [...$rules,
                'documentationPhotos' => 'sometimes|nullable|array',
                'documentationPhotos.*' => 'array:id,image,caption,isDemo',
                'documentationPhotos.*.id' => 'required|string|max:64|distinct',
                'documentationPhotos.*.image' => ['required', 'string', 'max:191', 'regex:~^/(?:uploads/lazsip/[a-f0-9-]{36}\.(?:jpg|png|webp)|aid/[a-z0-9-]+\.(?:jpg|png|webp))$~D'],
                'documentationPhotos.*.caption' => 'present|nullable|string|max:500',
                'documentationPhotos.*.isDemo' => 'sometimes|boolean',
            ];
        }
        $data = $request->validate($rules);
        foreach ($data as $key => $value) {
            if (is_string($value)) {
                $data[$key] = trim($value);
            }
        }
        if (($data['type'] ?? null) === 'berita') {
            $data['formUrl'] = null;
        }

        return $data;
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->input($request);
        $row = $request->route('resource') === 'payment-fees' ? (LazsipPaymentFeeRef::where('method', $data['method'])->first() ?? new LazsipPaymentFeeRef) : $this->query($request)->getModel()->newInstance();
        $row->forceFill($data)->save();

        return response()->json(['ok' => true, 'id' => $row->id, 'data' => $row->refresh()], 201)->header('Location', $request->url().'/'.$row->id);
    }

    public function update(Request $request): JsonResponse
    {
        $row = $this->query($request)->findOrFail($request->route('id'));
        $row->forceFill($this->input($request))->save();

        return response()->json(['ok' => true]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $this->query($request)->findOrFail($request->route('id'))->delete();

        return response()->json(['ok' => true]);
    }

    public function siteContent(string $key): JsonResponse
    {
        abort_unless(in_array($key, ['hero', 'tentang', 'legalitas', 'kontak', 'zakatFitrah', 'transparansi'], true), 404);
        $row = LazsipSiteContent::where('section_key', $key)->first();

        return response()->json(['data' => $row ? json_decode($row->contentJson, true, flags: JSON_THROW_ON_ERROR) : null]);
    }

    public function updateSiteContent(Request $request, string $key): JsonResponse
    {
        abort_unless(in_array($key, ['hero', 'tentang', 'legalitas', 'kontak', 'zakatFitrah', 'transparansi'], true), 404);
        $data = $request->validate(['content' => 'required|array', 'content.*' => 'string|max:1000000']);
        $row = LazsipSiteContent::where('section_key', $key)->first() ?? new LazsipSiteContent;
        $row->forceFill(['sectionKey' => $key, 'contentJson' => json_encode($data['content'], JSON_THROW_ON_ERROR)])->save();

        return response()->json(['ok' => true]);
    }

    public function verifierFilters(): JsonResponse
    {
        return response()->json(['data' => ['count' => LazsipBeneficiary::count(), 'areas' => LazsipBeneficiary::distinct()->orderBy('verifier_area')->pluck('verifier_area'), 'names' => LazsipBeneficiary::distinct()->orderBy('verifier_name')->pluck('verifier_name')]]);
    }

    public function applicants(Request $request): JsonResponse
    {
        $request->validate(['page' => 'sometimes|integer|min:1', 'per_page' => 'sometimes|integer|min:1|max:100']);

        return response()->json(LazsipProgramApplicant::with('program:id,title')->orderByDesc('created_at')->orderBy('id')->paginate($request->integer('per_page', 100)));
    }

    public function applicantStatus(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['status' => 'required|in:baru,diproses,diterima,ditolak']);
        $row = LazsipProgramApplicant::findOrFail($id);
        $row->status = $data['status'];
        $row->save();

        return response()->json(['ok' => true]);
    }

    public function registration(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['registrationOpen' => 'required|boolean']);
        $row = LazsipProgram::findOrFail($id);
        $row->registrationOpen = $data['registrationOpen'];
        $row->save();

        return response()->json(['ok' => true]);
    }

    public function apply(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['name' => 'required|string|max:191', 'contact' => 'required|string|max:191']);
        DB::transaction(function () use ($id, $data): void {
            $program = LazsipProgram::whereKey($id)->lockForUpdate()->firstOrFail();
            abort_unless($program->registrationOpen, 409, 'Pendaftaran program ini sedang ditutup.');
            $row = new LazsipProgramApplicant;
            $row->forceFill(['programId' => $id, ...$data, 'status' => 'baru'])->save();
        });

        return response()->json(['ok' => true], 201);
    }

    public function checkoutMethods(): JsonResponse
    {
        $gateway = config('payment.gateway');
        $data = in_array($gateway, ['ipaymu', 'ipaymu_sandbox'], true)
            ? [['id' => $gateway, 'method' => $gateway === 'ipaymu' ? 'iPaymu' : 'iPaymu Sandbox', 'feeAmount' => 0, 'feePercentage' => 0]]
            : LazsipPaymentFeeRef::orderBy('method')->get();

        return response()->json(['data' => $data]);
    }
}
