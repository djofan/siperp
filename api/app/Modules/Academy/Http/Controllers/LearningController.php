<?php

namespace App\Modules\Academy\Http\Controllers;

use App\Modules\Academy\Models\AcademyDiscussion as Discussion;
use App\Modules\Academy\Models\AcademyLiveSession as LiveSession;
use App\Modules\Academy\Models\AcademyNotificationRead as NotificationRead;
use App\Modules\Academy\Models\AcademyStudyNote as Note;
use App\Modules\Academy\Models\ZakatAcademyCourse as Course;
use App\Modules\Academy\Models\ZakatAcademyEnrollment as Enrollment;
use App\Modules\Academy\Models\ZakatAcademyLesson as Lesson;
use App\Modules\Academy\Models\ZakatAcademyLessonProgress as Progress;
use App\Modules\Academy\Models\ZakatAcademyProfile as Profile;
use App\Modules\Academy\Services\AcademyContext;
use App\Modules\Core\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class LearningController
{
    public function __construct(private AcademyContext $context) {}

    private function data($value)
    {
        return response()->json(['data' => $value]);
    }

    public function enroll(Request $request, string $courseId)
    {
        $this->context->available($request);
        $slug = DB::transaction(function () use ($request, $courseId) {
            $course = Course::where('id', $courseId)->where('is_published', true)->lockForUpdate()->firstOrFail();
            $profile = Profile::where('user_id', $request->user()->id)->lockForUpdate()->first();
            abort_if($profile?->deletedAt, 403, 'Akun peserta sudah dihapus.');
            if ($course->cohortId) {
                abort_unless($profile && app(\App\Modules\Academy\Services\CohortLearning::class)->owns($profile->id, $course->cohortId), 403, 'Daftar ke angkatan ini terlebih dahulu.');
                app(\App\Modules\Academy\Services\CohortLearning::class)->enrollCourses($profile->id, $course->cohortId);
                return $course->slug;
            }
            if ($profile && Enrollment::where('profile_id', $profile->id)->where('course_id', $courseId)->exists()) {
                return $course->slug;
            }
            abort_unless($course->registrationOpen && (! $course->startsAt || $course->startsAt->isFuture()), 409, 'Pendaftaran angkatan sudah ditutup.');
            if (! $profile) {
                DB::table('participant_sequences')->insertOrIgnore(['module_slug' => 'academy', 'last_number' => 0]);
                $counter = DB::table('participant_sequences')->where('module_slug', 'academy')->lockForUpdate()->first();
                $number = $counter->last_number + 1;
                DB::table('participant_sequences')->where('module_slug', 'academy')->update(['last_number' => $number]);
                $profile = new Profile;
                $profile->userId = $request->user()->id;
                $profile->nis = 'PAZ'.str_pad((string) $number, 3, '0', STR_PAD_LEFT);
                $profile->save();
            }
            $row = new Enrollment;
            $row->courseId = $courseId;
            $row->profileId = $profile->id;
            $row->save();

            return $course->slug;
        }, 3);

        return $this->data(['slug' => $slug]);
    }

    public function mark(Request $request, string $lessonId)
    {
        $profile = $this->context->profile($request);
        $data = $request->validate(['completed' => 'required|boolean']);
        DB::transaction(function () use ($profile, $lessonId, $data) {
            $profile->newQuery()->where('id', $profile->id)->lockForUpdate()->firstOrFail();
            $this->context->lesson($lessonId, $profile->id);
            $row = Progress::where('profile_id', $profile->id)->where('lesson_id', $lessonId)->first() ?? new Progress;
            $row->profileId = $profile->id;
            $row->lessonId = $lessonId;
            $row->completed = $data['completed'];
            $row->completedAt = $data['completed'] ? now() : null;
            $row->save();
        }, 3);

        return $this->data(true);
    }

    public function note(Request $request, string $lessonId)
    {
        $profile = $this->context->profile($request);
        $data = $request->validate(['content' => 'nullable|string|max:20000']);
        DB::transaction(function () use ($profile, $lessonId, $data) {
            $profile->newQuery()->where('id', $profile->id)->lockForUpdate()->firstOrFail();
            $this->context->lesson($lessonId, $profile->id);
            $row = Note::where('profile_id', $profile->id)->where('lesson_id', $lessonId)->first() ?? new Note;
            $row->profileId = $profile->id;
            $row->lessonId = $lessonId;
            $row->content = $data['content'] ?? '';
            $row->save();
        }, 3);

        return $this->data(true);
    }

    public function password(Request $request)
    {
        $data = $request->validate(['currentPassword' => 'required|string', 'password' => 'required|string|min:10', 'confirmPassword' => 'required|same:password']);
        abort_if(strlen($data['password']) > 72 || $data['password'] === $data['currentPassword'], 422, 'Gunakan password baru minimal 10 karakter dan maksimal 72 byte.');
        DB::transaction(function () use ($request, $data) {
            $user = User::where('id', $request->user()->id)->lockForUpdate()->firstOrFail();
            abort_unless(Hash::check($data['currentPassword'], $user->password_hash), 422, 'Password saat ini tidak sesuai.');
            $user->password_hash = Hash::make($data['password']);
            $user->save();
            Profile::where('user_id', $user->id)->update(['must_change_password' => false]);
            $user->tokens()->delete();
        });

        return response()->json(['data' => true])->withCookie(cookie()->forget('sip_session'));
    }

    public function ask(Request $request, string $courseId)
    {
        $profile = $this->context->profile($request);
        $data = $request->validate(['question' => 'required|string|min:10|max:3000']);
        Enrollment::where('profile_id', $profile->id)->where('course_id', $courseId)->firstOrFail();
        $row = new Discussion;
        $row->profileId = $profile->id;
        $row->courseId = $courseId;
        $row->question = $data['question'];
        $row->save();

        return $this->data(true);
    }

    public function answer(Request $request, string $id)
    {
        $this->context->teacher($request);
        $data = $request->validate(['answer' => 'required|string|max:10000']);
        $row = Discussion::findOrFail($id);
        $row->answer = $data['answer'];
        $row->answeredAt = now();
        $row->save();

        return $this->data(true);
    }

    public function audio(Request $request, string $id)
    {
        $this->context->teacher($request);
        $data = $request->validate(['audioUrl' => 'required|string|max:2048']);
        abort_unless($this->context->safeUrl($data['audioUrl']), 422, 'URL audio tidak valid.');
        $row = Lesson::findOrFail($id);
        $row->videoProvider = 'AUDIO';
        $row->videoUrl = $data['audioUrl'];
        $row->isPublished = false;
        $row->save();

        return $this->data(true);
    }

    public function session(Request $request, string $courseId)
    {
        $this->context->teacher($request);
        Course::findOrFail($courseId);
        $data = $request->validate(['title' => 'required|string|max:191', 'startsAt' => 'required|date_format:Y-m-d\TH:i', 'joinUrl' => 'required|string|max:2048']);
        $date = CarbonImmutable::createFromFormat('!Y-m-d\TH:i', $data['startsAt'], 'Asia/Jakarta')->utc();
        abort_unless($date->isFuture() && $this->context->safeUrl($data['joinUrl']), 422, 'Isi waktu sesi mendatang dan URL yang valid.');
        $row = new LiveSession;
        $row->courseId = $courseId;
        $row->title = $data['title'];
        $row->startsAt = $date;
        $row->joinUrl = $data['joinUrl'];
        $row->save();

        return $this->data(true);
    }

    public function reminder(Request $request)
    {
        $profile = $this->context->profile($request);
        $data = $request->validate(['key' => 'required|string|max:191']);
        // Validate membership when creating the notification list; no cross-user writes.
        DB::transaction(function () use ($profile, $data) {
            $profile->newQuery()->where('id', $profile->id)->lockForUpdate()->firstOrFail();
            $row = NotificationRead::where('profile_id', $profile->id)->where('key', $data['key'])->first() ?? new NotificationRead;
            $row->profileId = $profile->id;
            $row->key = $data['key'];
            $row->readAt = now();
            $row->save();
        });

        return $this->data(true);
    }
}
