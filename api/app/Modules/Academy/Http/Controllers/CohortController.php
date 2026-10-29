<?php

namespace App\Modules\Academy\Http\Controllers;

use App\Modules\Academy\Models\AcademyCohort as Cohort;
use App\Modules\Academy\Models\AcademyCohortMembership as Membership;
use App\Modules\Academy\Services\AcademyContext;
use App\Modules\Academy\Services\CohortLearning;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CohortController
{
    public function __construct(private AcademyContext $context, private CohortLearning $learning) {}

    public function index(Request $request)
    {
        $profile = $this->context->profile($request);
        $memberships = Membership::where('profile_id', $profile->id)->get()->keyBy('cohortId');
        $rows = Cohort::where('registration_open', true)->orWhereIn('id', $memberships->keys())->orderByDesc('created_at')->orderBy('id')->get()->map(function ($row) use ($memberships, $profile) {
            $membership = $memberships->get($row->id);
            return ['id' => $row->id, 'title' => $row->title, 'registrationOpen' => $row->registrationOpen, 'joined' => (bool) $membership, 'current' => $profile->cohortId === $row->id, 'finished' => (bool) $membership && ($membership->finishedAt || $this->learning->finished($profile->id, $row->id))];
        });
        return response()->json(['data' => $rows]);
    }

    public function join(Request $request, string $id)
    {
        $profile = $this->context->profile($request);
        DB::transaction(function () use ($profile, $id) {
            $cohort = Cohort::where('id', $id)->lockForUpdate()->firstOrFail();
            abort_if($this->learning->owns($profile->id, $cohort->id), 409, 'Anda sudah terdaftar pada angkatan ini.');
            abort_unless($cohort->registrationOpen, 409, 'Pendaftaran angkatan sudah ditutup.');
            $this->learning->join($profile, $cohort);
        }, 3);
        return response()->json(['data' => ['message' => 'Berhasil mendaftar angkatan.']]);
    }
}
