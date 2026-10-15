<?php

namespace App\Modules\Core\Http\Controllers;

use App\Modules\Academy\Models\ZakatAcademyCourse;
use App\Modules\Academy\Models\ZakatAcademyEnrollment;
use App\Modules\Academy\Models\ZakatAcademyProfile;
use App\Modules\Academy\Services\AcademyContext;
use App\Modules\Core\Auth\SessionData;
use App\Modules\Core\Models\ModuleAccess;
use App\Modules\Core\Models\User;
use App\Modules\Teknisi\Models\TeknisiOutlet;
use App\Modules\Teknisi\Models\TeknisiParticipant;
use App\Modules\Teknisi\Models\TeknisiTechnician;
use App\Modules\Teknisi\Models\TeknisiTicket;
use App\Modules\Teknisi\Services\TeknisiContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class ParticipantController
{
    private function authorize(Request $request, string $module): void
    {
        abort_unless(in_array($module, ['academy', 'teknisi'], true), 404);
        if ($module === 'teknisi') {
            app(TeknisiContext::class)->actor($request, true, true);

            return;
        }
        $session = app(SessionData::class)->forUser($request->user());
        abort_unless($request->user()->is_superadmin || ($session['moduleRoles']['academy'] ?? null) === 'admin', 403);
    }

    private function input(Request $request, string $module, bool $create): array
    {
        $phone = preg_replace('/[\s()+.\-]/', '', (string) $request->input('phone'));
        if (str_starts_with($phone, '0')) {
            $phone = '62'.substr($phone, 1);
        }
        $request->merge(['phone' => $phone]);
        $rules = ['name' => 'required|string|min:2|max:100', 'address' => 'required|string|max:2000', 'phone' => ['required', 'regex:/^628\d{7,12}$/'], 'password' => ($create ? 'required' : 'nullable').'|string|min:10', 'specialty' => 'nullable|string|max:191', 'outletId' => 'nullable|string', 'courseId' => 'nullable|string'];
        if ($module === 'academy') {
            $rules['gender'] = 'required|in:IKHWAN,AKHWAT';
        }
        $data = $request->validate($rules);
        abort_if(strlen($data['password'] ?? '') > 72, 422, 'Password maksimal 72 byte.');

        return $data;
    }

    private function target(string $module, string $id)
    {
        $class = $module === 'academy' ? ZakatAcademyProfile::class : TeknisiParticipant::class;
        $profile = $class::where('id', $id)->whereNull('deleted_at')->lockForUpdate()->firstOrFail();
        $user = User::where('id', $profile->userId)->lockForUpdate()->firstOrFail();
        abort_if($user->is_superadmin || DB::table('module_access')->join('modules', 'modules.id', '=', 'module_access.module_id')->where('user_id', $user->id)->where('modules.slug', $module)->whereIn('role', ['admin', 'manager', 'teacher'])->exists(), 403, 'Akun pengelola tidak dapat diubah melalui panel peserta.');

        return [$profile, $user];
    }

    private function assignTechnician(User $user, array $data): void
    {
        $outlet = TeknisiOutlet::where('id', $data['outletId'] ?? '')->where('isActive', true)->lockForUpdate()->firstOrFail();
        abort_if(TeknisiTechnician::where('outletId', $outlet->id)->where('isActive', true)->where('userId', '!=', $user->id)->exists(), 409, 'Outlet ini sudah memiliki teknisi aktif.');
        $tech = TeknisiTechnician::where('userId', $user->id)->lockForUpdate()->first() ?? new TeknisiTechnician;
        abort_if($tech->exists && $tech->outletId !== $outlet->id && TeknisiTicket::where('technicianId', $tech->id)->whereNotIn('status', TeknisiContext::CLOSED)->exists(), 409, 'Selesaikan tiket aktif sebelum memindahkan teknisi.');
        $tech->userId = $user->id;
        $tech->name = $user->name;
        $tech->outletId = $outlet->id;
        $tech->activeOutletId = $outlet->id;
        $tech->specialty = $data['specialty'] ?: ($tech->specialty ?: 'Servis HP');
        $tech->isActive = true;
        $tech->save();
        $moduleId = DB::table('modules')->where('slug', 'teknisi')->value('id');
        $access = ModuleAccess::where('user_id', $user->id)->where('module_id', $moduleId)->first() ?? new ModuleAccess;
        $access->userId = $user->id;
        $access->moduleId = $moduleId;
        $access->role = 'technician';
        $access->save();
    }

    public function store(Request $request, string $module)
    {
        return $this->create($request, $module, false);
    }

    public function registerAcademy(Request $request)
    {
        return $this->create($request, 'academy', true);
    }

    private function create(Request $request, string $module, bool $public)
    {
        if ($public) {
            app(AcademyContext::class)->available($request);
            $request->validate(['email' => 'required|email|max:191|unique:users,email', 'confirmPassword' => 'required|same:password']);
            $course = ZakatAcademyCourse::where('is_published', true)->where('registration_open', true)->where('is_simulation', false)->where(fn ($q) => $q->whereNull('starts_at')->orWhere('starts_at', '>', now()))->orderBy('order')->orderBy('id')->firstOrFail();
            $request->merge(['courseId' => $course->id]);
        } else {
            $this->authorize($request, $module);
        }
        $data = $this->input($request, $module, true);
        if ($public) {
            $data['email'] = strtolower(trim($request->input('email')));
        }
        $result = DB::transaction(function () use ($module, $data) {
            $course = null;
            if ($module === 'academy' && ! empty($data['courseId'])) {
                $course = ZakatAcademyCourse::where('id', $data['courseId'])->lockForUpdate()->firstOrFail();
                abort_unless($course->isPublished && $course->registrationOpen && ($course->isSimulation || ! $course->startsAt || $course->startsAt->isFuture()), 409, 'Pendaftaran program sudah ditutup.');
                abort_if($course->enrollments()->count() >= $course->quota, 409, 'Kuota program sudah penuh.');
            }
            DB::table('participant_sequences')->insertOrIgnore(['module_slug' => $module, 'last_number' => 0]);
            $counter = DB::table('participant_sequences')->where('module_slug', $module)->lockForUpdate()->first();
            $number = $counter->last_number + 1;
            DB::table('participant_sequences')->where('module_slug', $module)->update(['last_number' => $number]);
            $nip = ($module === 'academy' ? 'PAZ' : 'PTH').str_pad((string) $number, $module === 'academy' ? 3 : 2, '0', STR_PAD_LEFT);
            $user = new User;
            $user->name = $data['name'];
            $user->email = $data['email'] ?? strtolower($nip).'@peserta.sip.invalid';
            $user->password_hash = Hash::make($data['password']);
            $user->save();
            $profile = $module === 'academy' ? new ZakatAcademyProfile : new TeknisiParticipant;
            $profile->userId = $user->id;
            $profile->address = $data['address'];
            $profile->phone = $data['phone'];
            if ($module === 'academy') {
                $profile->nis = $nip;
                $profile->gender = $data['gender'];
            } else {
                $profile->nip = $nip;
            }
            $profile->save();
            if ($module === 'teknisi') {
                $this->assignTechnician($user, $data + ['specialty' => null]);
            }
            if ($course) {
                $enrollment = new ZakatAcademyEnrollment;
                $enrollment->profileId = $profile->id;
                $enrollment->courseId = $course->id;
                $enrollment->save();
            }

            return ['userId' => $user->id, 'nip' => $nip];
        }, 3);

        return response()->json(['data' => $result], 201);
    }

    public function update(Request $request, string $module, string $id)
    {
        $this->authorize($request, $module);
        $data = $this->input($request, $module, false);
        DB::transaction(function () use ($module, $id, $data) {
            [$profile, $user] = $this->target($module, $id);
            $profile->address = $data['address'];
            $profile->phone = $data['phone'];
            $user->name = $data['name'];
            if ($module === 'academy') {
                $profile->gender = $data['gender'];
            }
            if (! empty($data['password'])) {
                $user->password_hash = Hash::make($data['password']);
                if ($module === 'academy') {
                    $profile->mustChangePassword = false;
                } $user->tokens()->delete();
            }
            $user->save();
            $profile->save();
            if ($module === 'teknisi') {
                $this->assignTechnician($user, $data + ['specialty' => null]);
            }
        }, 3);

        return response()->json(['data' => true]);
    }

    public function destroy(Request $request, string $module, string $id)
    {
        $this->authorize($request, $module);
        DB::transaction(function () use ($module, $id) {
            [$profile, $user] = $this->target($module, $id);
            $profile->deletedAt = now();
            $profile->phone = null;
            $profile->save();
            if ($module === 'teknisi') {
                TeknisiTechnician::where('userId', $user->id)->update(['isActive' => false, 'active_outlet_id' => null]);
            }
            DB::table('module_access')->where('user_id', $user->id)->whereIn('module_id', DB::table('modules')->where('slug', $module)->select('id'))->delete();
            $other = DB::table('module_access')->where('user_id', $user->id)->exists()
                || ZakatAcademyProfile::where('user_id', $user->id)->whereNull('deleted_at')->exists()
                || TeknisiParticipant::where('userId', $user->id)->whereNull('deleted_at')->exists()
                || DB::table('tanwir_members')->where('user_id', $user->id)->exists() || DB::table('ojol_members')->where('user_id', $user->id)->exists();
            if (! $other) {
                $user->is_active = false;
                $user->save();
                $user->tokens()->delete();
            }
        }, 3);

        return response()->json(['data' => true]);
    }
}
