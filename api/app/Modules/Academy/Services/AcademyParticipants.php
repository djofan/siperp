<?php

namespace App\Modules\Academy\Services;

use App\Contracts\Modules\ParticipantModule;
use App\Modules\Academy\Models\ZakatAcademyCourse;
use App\Modules\Academy\Models\ZakatAcademyEnrollment;
use App\Modules\Academy\Models\ZakatAcademyProfile;
use Illuminate\Http\Request;

class AcademyParticipants implements ParticipantModule
{
    public function authorize(Request $request): void
    {
        $session = app(\App\Modules\Core\Auth\SessionData::class)->forUser($request->user());
        abort_unless($request->user()->is_superadmin || ($session['moduleRoles']['academy'] ?? null) === 'admin', 403);
    }
    public function publicSetup(Request $request): void
    {
        app(AcademyContext::class)->available($request);
        $request->validate(['email' => 'required|email|max:191|unique:users,email', 'confirmPassword' => 'required|same:password']);
        $course = ZakatAcademyCourse::where('is_published', true)->where('registration_open', true)->where('is_simulation', false)->where(fn ($q) => $q->whereNull('starts_at')->orWhere('starts_at', '>', now()))->orderBy('order')->orderBy('id')->firstOrFail();
        $request->merge(['courseId' => $course->id]);
    }
    public function extraRules(): array { return ['gender' => 'required|in:IKHWAN,AKHWAT']; }
    public function codeFormat(): array { return ['PAZ', 3]; }
    public function userIdFor(string $profileId): string { return ZakatAcademyProfile::whereKey($profileId)->whereNull('deleted_at')->lockForUpdate()->firstOrFail()->userId; }
    public function createProfile(string $userId, array $data, string $code): void
    {
        $course = null;
        if (! empty($data['courseId'])) {
            $course = ZakatAcademyCourse::whereKey($data['courseId'])->lockForUpdate()->firstOrFail();
            abort_unless($course->isPublished && $course->registrationOpen && ($course->isSimulation || ! $course->startsAt || $course->startsAt->isFuture()), 409, 'Pendaftaran program sudah ditutup.');
            abort_if($course->enrollments()->count() >= $course->quota, 409, 'Kuota program sudah penuh.');
        }
        $profile = new ZakatAcademyProfile;
        $profile->forceFill(['userId' => $userId, 'address' => $data['address'], 'phone' => $data['phone'], 'nis' => $code, 'gender' => $data['gender']])->save();
        if ($course) {
            $enrollment = new ZakatAcademyEnrollment;
            $enrollment->forceFill(['profileId' => $profile->id, 'courseId' => $course->id])->save();
        }
    }
    public function updateProfile(string $profileId, string $userId, array $data): void
    {
        $profile = ZakatAcademyProfile::findOrFail($profileId);
        $profile->forceFill(['address' => $data['address'], 'phone' => $data['phone'], 'gender' => $data['gender']]);
        if (! empty($data['password'])) $profile->mustChangePassword = false;
        $profile->save();
    }
    public function removeProfile(string $profileId, string $userId): void
    {
        ZakatAcademyProfile::findOrFail($profileId)->forceFill(['deletedAt' => now(), 'phone' => null])->save();
    }
    public function hasMembership(string $userId): bool { return ZakatAcademyProfile::where('user_id', $userId)->whereNull('deleted_at')->exists(); }
}
