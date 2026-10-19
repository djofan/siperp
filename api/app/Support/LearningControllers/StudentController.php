<?php

namespace App\Support\LearningControllers;

use App\Modules\Tanwir\Models\TanwirMember;
use App\Modules\Tanwir\Models\TanwirStudent;
use Illuminate\Http\Request;

class StudentController extends BaseController
{
    private function scoped(Request $request)
    {
        abort_unless($this->module($request) === 'tanwir', 404);
        $context = $this->context($request);
        $query = TanwirStudent::query();
        if ($context['admin']) {
            return $query;
        }
        $member = $context['member'];
        if ($member->role === 'peserta') {
            return $query->where('member_id', $member->id);
        }

        return $query->whereHas('member.group', fn ($query) => $query->where('pic_id', $member->id));
    }

    public function index(Request $request)
    {
        $data = $request->validate(['search' => 'sometimes|string|max:200']);
        $query = $this->scoped($request)->with(['member.user:id,name', 'member.group:id,name']);
        if (! empty($data['search'])) {
            $query->where(fn ($query) => $query->where('name', 'like', '%'.$data['search'].'%')->orWhere('parent_name', 'like', '%'.$data['search'].'%'));
        }

        return $this->page($request, $query->orderByDesc('updated_at')->orderBy('id'), function ($row) {
            $data = $row->toArray();
            $data['member'] = ['id' => $row->member->id, 'code' => $row->member->code, 'teachingPlace' => $row->member->teachingPlace, 'user' => ['name' => $row->member->user->name], 'group' => $row->member->group ? ['name' => $row->member->group->name] : null];

            return $data;
        });
    }

    public function show(Request $request, string $id)
    {
        return response()->json(['data' => $this->scoped($request)->findOrFail($id)]);
    }

    public function owners(Request $request)
    {
        abort_unless($this->module($request) === 'tanwir', 404);
        $context = $this->context($request);
        if (! $context['admin'] && $context['member']->role === 'peserta') {
            return response()->json(['data' => []]);
        }
        $query = TanwirMember::with('user:id,name')->where('role', 'peserta');
        if (! $context['admin']) {
            $query->whereHas('group', fn ($query) => $query->where('pic_id', $context['member']->id));
        }

        return response()->json(['data' => $query->orderBy('code')->get()->map(fn ($row) => ['id' => $row->id, 'code' => $row->code, 'user' => ['name' => $row->user->name]])]);
    }

    private function input(Request $request): array
    {
        $data = $request->validate(['name' => 'required|string|max:191', 'age' => 'sometimes|nullable|integer|min:1|max:99', 'className' => 'sometimes|nullable|string|max:191', 'parentName' => 'sometimes|nullable|string|max:191', 'parentPhone' => ['sometimes', 'nullable', 'string', 'max:20', 'regex:/^[+\d][\d\s-]{6,19}$/D'], 'progress' => 'sometimes|nullable|string|max:5000']);
        $context = $this->context($request);
        if (! $context['admin'] && $context['member']->role === 'peserta') {
            $owner = $context['member'];
        } else {
            $query = TanwirMember::where('role', 'peserta');
            if (! $context['admin']) {
                $query->whereHas('group', fn ($query) => $query->where('pic_id', $context['member']->id));
            }
            $owner = $query->find($request->input('memberId'));
            abort_unless($owner, 422, 'Pilih peserta yang valid.');
        }
        $data['memberId'] = $owner->id;

        return $data;
    }

    public function store(Request $request)
    {
        $data = $this->input($request);
        $row = new TanwirStudent;
        $row->forceFill($data)->save();

        return response()->json(['ok' => true], 201);
    }

    public function update(Request $request, string $id)
    {
        $row = $this->scoped($request)->findOrFail($id);
        $row->forceFill($this->input($request))->save();

        return response()->json(['ok' => true]);
    }

    public function destroy(Request $request, string $id)
    {
        $this->scoped($request)->findOrFail($id)->delete();

        return response()->json(['ok' => true]);
    }
}
