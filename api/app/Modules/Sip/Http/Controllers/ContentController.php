<?php

namespace App\Modules\Sip\Http\Controllers;

use App\Modules\Sip\Models\SipLaporan;
use App\Modules\Sip\Models\SipNews;
use App\Modules\Sip\Models\SipPenyaluranBantuan;
use App\Modules\Sip\Models\SipProgramBantuan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class ContentController
{
    private function query(Request $request)
    {
        $query = match ($request->route('resource')) {
            'news' => SipNews::query(), 'program-bantuan' => SipProgramBantuan::query(),
            'penyaluran-bantuan' => SipPenyaluranBantuan::query(), 'laporan' => SipLaporan::query(),
            default => abort(404),
        };
        if ($request->route('resource') === 'news' && ! $request->route('admin')) {
            $query->where('status', 'published');
        }

        return $query;
    }

    public function index(Request $request): JsonResponse
    {
        $query = $this->query($request);
        $resource = $request->route('resource');
        if ($resource === 'news') {
            if (! $request->route('admin')) {
                $query->orderByDesc('is_pinned');
            }
            $query->orderByDesc('created_at');
        } elseif ($resource === 'program-bantuan') {
            $query->orderByDesc('is_pinned')->orderByDesc('created_at');
        } elseif ($resource === 'penyaluran-bantuan') {
            $query->orderByDesc('date');
        } else {
            $data = $request->validate(['type' => 'sometimes|in:bulanan,tahunan']);
            if (isset($data['type'])) {
                $query->where('type', $data['type']);
            }
            $query->orderByDesc('period_year')->orderByDesc('period_month');
        }
        $request->validate(['page' => 'sometimes|integer|min:1', 'per_page' => 'sometimes|integer|min:1|max:100']);

        // Lists are consumed by the existing frontend, which follows pagination in its adapter.
        return response()->json($query->orderBy('id')->paginate($request->integer('per_page', 100))->toArray());
    }

    public function show(Request $request): JsonResponse
    {
        $query = $this->query($request);
        $row = $request->route('slug') ? $query->where('slug', $request->route('slug'))->firstOrFail() : $query->findOrFail($request->route('id'));

        return response()->json(['data' => $row]);
    }

    private function input(Request $request): array
    {
        $resource = $request->route('resource');
        $id = $request->route('id');
        $image = ['sometimes', 'nullable', 'string', 'max:191', 'regex:~^(?:/uploads/sip/[a-f0-9-]{36}\.(?:jpg|png|webp)|https?://[^\s]+)$~i'];
        $rules = match ($resource) {
            'news' => ['title' => 'required|string|max:191', 'content' => 'required|string|max:1000000', 'image' => $image, 'isPinned' => 'required|boolean', 'status' => 'required|in:draft,published'],
            'program-bantuan' => ['title' => 'required|string|max:191', 'description' => 'required|string|max:1000000', 'slug' => ['required', 'string', 'max:191', Rule::unique('sip_program_bantuan', 'slug')->ignore($id)], 'image' => $image, 'campaignUrl' => 'sometimes|nullable|url:http,https|max:191', 'isPinned' => 'required|boolean'],
            'penyaluran-bantuan' => ['title' => 'required|string|max:191', 'description' => 'required|string|max:1000000', 'image' => $image, 'location' => 'sometimes|nullable|string|max:191', 'date' => 'required|date'],
            'laporan' => ['title' => 'required|string|max:191', 'type' => 'required|in:bulanan,tahunan', 'periodYear' => 'required|integer|min:1900|max:9999', 'periodMonth' => 'required_if:type,bulanan|nullable|integer|min:1|max:12', 'fileUrl' => 'required|string|max:191'],
            default => abort(404),
        };
        if ($resource === 'program-bantuan') {
            $request->merge(['slug' => Str::slug($request->input('slug') ?: $request->input('title', ''))]);
        }
        $data = $request->validate($rules);
        foreach ($data as $key => $value) {
            if (is_string($value)) {
                $data[$key] = trim($value);
            }
        }
        if ($resource === 'laporan') {
            if ($data['type'] === 'tahunan') {
                $data['periodMonth'] = null;
            }
            abort_unless(preg_match('~^https?://~i', $data['fileUrl']) || preg_match('~^/uploads/sip/[a-f0-9-]{36}\.pdf$~', $data['fileUrl']), 422, 'Tautan laporan tidak valid.');
        }

        return $data;
    }

    public function store(Request $request): JsonResponse
    {
        $row = $this->query($request)->getModel()->newInstance();
        $row->forceFill($this->input($request))->save();
        $row->refresh();

        return response()->json(['ok' => true, 'id' => $row->id, 'data' => $row], 201)->header('Location', $request->url().'/'.$row->id);
    }

    public function update(Request $request): JsonResponse
    {
        $row = $this->query($request)->findOrFail($request->route('id'));
        $row->forceFill($this->input($request))->save();

        return response()->json(['ok' => true, 'data' => $row->refresh()]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $this->query($request)->findOrFail($request->route('id'))->delete();

        return response()->json(['ok' => true]);
    }
}
