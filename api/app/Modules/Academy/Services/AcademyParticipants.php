<?php

namespace App\Modules\Academy\Services;

use App\Contracts\Modules\ParticipantModule;
use App\Modules\Academy\Models\AcademyCohort;
use App\Modules\Academy\Models\ZakatAcademyCourse;
use App\Modules\Academy\Models\ZakatAcademyEnrollment;
use App\Modules\Academy\Models\ZakatAcademyProfile;
use App\Modules\Core\Auth\SessionData;
use Illuminate\Http\Request;

class AcademyParticipants implements ParticipantModule
{
    public function authorize(Request $request): void
    {
        $session = app(SessionData::class)->forUser($request->user());
        abort_unless($request->user()->is_superadmin || ($session['moduleRoles']['academy'] ?? null) === 'admin', 403);
    }

    public function publicSetup(Request $request): void
    {
        app(AcademyContext::class)->available($request);
        $request->validate(['email' => 'required|email|max:191|unique:users,email', 'confirmPassword' => 'required|same:password']);
        $cohort = AcademyCohort::where('registration_open', true)->orderByDesc('created_at')->first();
        abort_unless($cohort !== null, 409, 'Pendaftaran angkatan belum dibuka.');
        $request->merge(['cohortId' => $cohort->id, 'courseId' => null]);
        $request->attributes->set('academy.public_registration', true);
    }

    public function extraRules(): array
    {
        return ['gender' => 'required|in:IKHWAN,AKHWAT', 'cohortId' => 'nullable|string|exists:academy_cohorts,id'];
    }

    public function codeFormat(): array
    {
        return ['PAZ', 3];
    }

    public function userIdFor(string $profileId): string
    {
        return ZakatAcademyProfile::whereKey($profileId)->whereNull('deleted_at')->lockForUpdate()->firstOrFail()->userId;
    }

    public function createProfile(string $userId, array $data, string $code): void
    {
        abort_unless(! empty($data['cohortId']), 422, 'Pilih angkatan peserta.');
        $cohort = AcademyCohort::whereKey($data['cohortId'])->lockForUpdate()->firstOrFail();
        abort_if(request()->attributes->get('academy.public_registration', false) && ! $cohort->registrationOpen, 409, 'Pendaftaran angkatan sudah ditutup.');
        $course = null;
        if (! empty($data['courseId'])) {
            $course = ZakatAcademyCourse::whereKey($data['courseId'])->lockForUpdate()->firstOrFail();
            abort_if($course->cohortId && $course->cohortId !== $cohort->id, 422, 'Materi bukan milik angkatan peserta.');
            abort_unless($course->isPublished && $course->registrationOpen && ($course->isSimulation || ! $course->startsAt || $course->startsAt->isFuture()), 409, 'Pendaftaran program sudah ditutup.');
            abort_if($course->enrollments()->count() >= $course->quota, 409, 'Kuota program sudah penuh.');
        }
        $profile = new ZakatAcademyProfile;
        $profile->forceFill(['userId' => $userId, 'address' => $data['address'], 'phone' => $data['phone'], 'nis' => $code, 'gender' => $data['gender'], 'cohortId' => $cohort->id])->save();
        app(CohortLearning::class)->join($profile, $cohort);
        if ($course && ! ZakatAcademyEnrollment::where('profile_id', $profile->id)->where('course_id', $course->id)->exists()) {
            $enrollment = new ZakatAcademyEnrollment;
            $enrollment->forceFill(['profileId' => $profile->id, 'courseId' => $course->id])->save();
        }
    }

    public function updateProfile(string $profileId, string $userId, array $data): void
    {
        $profile = ZakatAcademyProfile::findOrFail($profileId);
        if (! empty($data['cohortId'])) {
            $cohort = AcademyCohort::whereKey($data['cohortId'])->lockForUpdate()->firstOrFail();
            if ($profile->cohortId !== $cohort->id) {
                app(CohortLearning::class)->join($profile, $cohort);
            }
        }
        $profile->forceFill(['address' => $data['address'], 'phone' => $data['phone'], 'gender' => $data['gender']]);
        if (! empty($data['password'])) {
            $profile->mustChangePassword = false;
        }
        $profile->save();
    }

    public function removeProfile(string $profileId, string $userId): void
    {
        ZakatAcademyProfile::findOrFail($profileId)->forceFill(['deletedAt' => now(), 'phone' => null])->save();
    }

    public function hasMembership(string $userId): bool
    {
        return ZakatAcademyProfile::where('user_id', $userId)->whereNull('deleted_at')->exists();
    }
}
