<?php

namespace App\Modules\Core\Http\Controllers;

<<<<<<< Updated upstream
=======
use App\Modules\Academy\Models\AcademyCohort;
use App\Modules\Academy\Models\ZakatAcademyCourse;
use App\Modules\Academy\Models\ZakatAcademyEnrollment;
use App\Modules\Academy\Models\ZakatAcademyProfile;
use App\Modules\Academy\Services\AcademyContext;
use App\Modules\Core\Auth\SessionData;
use App\Modules\Core\Models\ModuleAccess;
>>>>>>> Stashed changes
use App\Modules\Core\Models\User;
use App\Support\ParticipantModules;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class ParticipantController
{
    private function input(Request $request, string $module, bool $create): array
    {
        $phone = preg_replace('/[\s()+.\-]/', '', (string) $request->input('phone'));
        if (str_starts_with($phone, '0')) $phone = '62'.substr($phone, 1);
        $request->merge(['phone' => $phone]);
        $rules = ['name' => 'required|string|min:2|max:100', 'address' => 'required|string|max:2000', 'phone' => ['required', 'regex:/^628\d{7,12}$/'], 'password' => ($create ? 'required' : 'nullable').'|string|min:10', 'specialty' => 'nullable|string|max:191', 'outletId' => 'nullable|string', 'courseId' => 'nullable|string'];
<<<<<<< Updated upstream
        $data = $request->validate([...$rules, ...app(ParticipantModules::class)->for($module)->extraRules()]);
=======
        if ($module === 'academy') {
            $rules['gender'] = 'required|in:IKHWAN,AKHWAT';
            $rules['cohortId'] = ($create ? 'required' : 'nullable').'|string|exists:academy_cohorts,id';
        }
        $data = $request->validate($rules);
>>>>>>> Stashed changes
        abort_if(strlen($data['password'] ?? '') > 72, 422, 'Password maksimal 72 byte.');
        return $data;
    }

    private function target(string $module, string $id): User
    {
        $userId = app(ParticipantModules::class)->for($module)->userIdFor($id);
        $user = User::whereKey($userId)->lockForUpdate()->firstOrFail();
        abort_if($user->is_superadmin || DB::table('module_access')->join('modules', 'modules.id', '=', 'module_access.module_id')->where('user_id', $user->id)->where('modules.slug', $module)->whereIn('role', ['admin', 'manager', 'teacher'])->exists(), 403, 'Akun pengelola tidak dapat diubah melalui panel peserta.');
        return $user;
    }

    public function store(Request $request, string $module) { return $this->create($request, $module, false); }
    public function registerAcademy(Request $request) { return $this->create($request, 'academy', true); }

    private function create(Request $request, string $module, bool $public)
    {
<<<<<<< Updated upstream
        $adapter = app(ParticipantModules::class)->for($module);
        if ($public) $adapter->publicSetup($request);
        else $adapter->authorize($request);
        $data = $this->input($request, $module, true);
        if ($public) $data['email'] = strtolower(trim($request->input('email')));
        $result = DB::transaction(function () use ($module, $data, $adapter) {
            DB::table('participant_sequences')->insertOrIgnore(['module_slug' => $module, 'last_number' => 0]);
            $counter = DB::table('participant_sequences')->where('module_slug', $module)->lockForUpdate()->first();
=======
        if ($public) {
            app(AcademyContext::class)->available($request);
            $request->validate(['email' => 'required|email|max:191|unique:users,email', 'confirmPassword' => 'required|same:password']);
            $cohort = AcademyCohort::where('registration_open', true)->orderByDesc('created_at')->first();
            abort_unless($cohort, 409, 'Pendaftaran angkatan belum dibuka.');
            $request->merge(['cohortId' => $cohort->id, 'courseId' => null]);
        } else {
            $this->authorize($request, $module);
        }
        $data = $this->input($request, $module, true);
        if ($public) {
            $data['email'] = strtolower(trim($request->input('email')));
        }
        $result = DB::transaction(function () use ($module, $data, $public) {
            DB::table('participant_sequences')->insertOrIgnore(['module_slug' => $module, 'last_number' => 0]);
            $counter = DB::table('participant_sequences')->where('module_slug', $module)->lockForUpdate()->first();
            $cohort = null;
            if ($module === 'academy') {
                $cohort = AcademyCohort::where('id', $data['cohortId'])->lockForUpdate()->firstOrFail();
                abort_if($public && ! $cohort->registrationOpen, 409, 'Pendaftaran angkatan sudah ditutup.');
            }
            $course = null;
            if ($module === 'academy' && ! empty($data['courseId'])) {
                $course = ZakatAcademyCourse::where('id', $data['courseId'])->lockForUpdate()->firstOrFail();
                abort_if($course->cohortId && $course->cohortId !== $cohort->id, 422, 'Materi bukan milik angkatan peserta.');
                abort_unless($course->isPublished && $course->registrationOpen && ($course->isSimulation || ! $course->startsAt || $course->startsAt->isFuture()), 409, 'Pendaftaran program sudah ditutup.');
            }
>>>>>>> Stashed changes
            $number = $counter->last_number + 1;
            DB::table('participant_sequences')->where('module_slug', $module)->update(['last_number' => $number]);
            [$prefix, $width] = $adapter->codeFormat();
            $nip = $prefix.str_pad((string) $number, $width, '0', STR_PAD_LEFT);
            $user = new User;
            $user->name = $data['name'];
            $user->email = $data['email'] ?? strtolower($nip).'@peserta.sip.invalid';
            $user->password_hash = Hash::make($data['password']);
            $user->save();
<<<<<<< Updated upstream
            $adapter->createProfile($user->id, $data, $nip);
=======
            $profile = $module === 'academy' ? new ZakatAcademyProfile : new TeknisiParticipant;
            $profile->userId = $user->id;
            $profile->address = $data['address'];
            $profile->phone = $data['phone'];
            if ($module === 'academy') {
                $profile->cohortId = $cohort->id;
                $profile->nis = $nip;
                $profile->gender = $data['gender'];
            } else {
                $profile->nip = $nip;
            }
            $profile->save();
            if ($cohort) { app(\App\Modules\Academy\Services\CohortLearning::class)->join($profile, $cohort); }
            if ($module === 'teknisi') {
                $this->assignTechnician($user, $data + ['specialty' => null]);
            }
            if ($course && ! ZakatAcademyEnrollment::where('profile_id', $profile->id)->where('course_id', $course->id)->exists()) {
                $enrollment = new ZakatAcademyEnrollment;
                $enrollment->profileId = $profile->id;
                $enrollment->courseId = $course->id;
                $enrollment->save();
            }

>>>>>>> Stashed changes
            return ['userId' => $user->id, 'nip' => $nip];
        }, 3);
        return response()->json(['data' => $result], 201);
    }

    public function update(Request $request, string $module, string $id)
    {
        $adapter = app(ParticipantModules::class)->for($module);
        $adapter->authorize($request);
        $data = $this->input($request, $module, false);
<<<<<<< Updated upstream
        DB::transaction(function () use ($module, $id, $data, $adapter) {
            $user = $this->target($module, $id);
=======
        DB::transaction(function () use ($module, $id, $data) {
            $cohort = $module === 'academy' && ! empty($data['cohortId'])
                ? AcademyCohort::where('id', $data['cohortId'])->lockForUpdate()->firstOrFail() : null;
            [$profile, $user] = $this->target($module, $id);
            if ($module === 'academy' && array_key_exists('cohortId', $data)) {
                if ($cohort) { app(\App\Modules\Academy\Services\CohortLearning::class)->join($profile, $cohort); }
            }
            $profile->address = $data['address'];
            $profile->phone = $data['phone'];
>>>>>>> Stashed changes
            $user->name = $data['name'];
            if (! empty($data['password'])) {
                $user->password_hash = Hash::make($data['password']);
                $user->tokens()->delete();
            }
            $user->save();
            $adapter->updateProfile($id, $user->id, $data);
        }, 3);
        return response()->json(['data' => true]);
    }

    public function destroy(Request $request, string $module, string $id)
    {
        $adapter = app(ParticipantModules::class)->for($module);
        $adapter->authorize($request);
        DB::transaction(function () use ($module, $id, $adapter) {
            $user = $this->target($module, $id);
            $adapter->removeProfile($id, $user->id);
            DB::table('module_access')->where('user_id', $user->id)->whereIn('module_id', DB::table('modules')->where('slug', $module)->select('id'))->delete();
            $other = DB::table('module_access')->where('user_id', $user->id)->exists() || app(ParticipantModules::class)->hasMembership($user->id);
            if (! $other) {
                $user->is_active = false;
                $user->save();
                $user->tokens()->delete();
            }
        }, 3);
        return response()->json(['data' => true]);
    }
}
