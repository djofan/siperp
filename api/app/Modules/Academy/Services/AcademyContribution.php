<?php

namespace App\Modules\Academy\Services;

use App\Contracts\Modules\ModuleContribution;
use App\Modules\Academy\Models\AcademyDiscussion;
use App\Modules\Academy\Models\ZakatAcademyCourse;
use App\Modules\Academy\Models\ZakatAcademyEnrollment;
use App\Modules\Academy\Models\ZakatAcademyProfile;
use Illuminate\Support\Facades\DB;

class AcademyContribution implements ModuleContribution
{
    public function overview(\Carbon\CarbonImmutable $start, \Carbon\CarbonImmutable $end): array
    {
        return ['courses' => ZakatAcademyCourse::where('is_simulation', false)->withCount('enrollments')->orderByDesc('created_at')->take(8)->get()->map(fn ($row) => AcademyDto::make($row)), 'enrollments' => ZakatAcademyEnrollment::whereHas('course', fn ($q) => $q->where('is_simulation', false))->count(), 'unanswered' => AcademyDiscussion::whereNull('answer')->whereHas('course', fn ($q) => $q->where('is_simulation', false))->count()];
    }

    public function contacts(): array
    {
        return ZakatAcademyProfile::whereNull('deleted_at')->with('user:id,name,email,is_superadmin')->get()->map(function ($row) {
            $teacher = DB::table('module_access')->join('modules', 'modules.id', '=', 'module_access.module_id')->where('user_id', $row->userId)->where('modules.slug', 'academy')->whereIn('role', ['teacher', 'pengajar'])->exists();
            return ['id' => $row->id, 'name' => $row->user->name, 'phone' => $row->phone, 'email' => $row->user->email, 'source' => 'academy', 'role' => $row->user->is_superadmin ? 'Superadmin Academy' : ($teacher ? 'Pengajar Academy' : 'Peserta Academy')];
        })->all();
    }
}
