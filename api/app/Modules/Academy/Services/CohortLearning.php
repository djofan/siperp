<?php

namespace App\Modules\Academy\Services;

use App\Modules\Academy\Models\AcademyCohort as Cohort;
use App\Modules\Academy\Models\AcademyCohortMembership as Membership;
use App\Modules\Academy\Models\ZakatAcademyChapter as Chapter;
use App\Modules\Academy\Models\ZakatAcademyCourse as Course;
use App\Modules\Academy\Models\ZakatAcademyEnrollment as Enrollment;
use App\Modules\Academy\Models\ZakatAcademyProfile as Profile;
use App\Modules\Academy\Models\ZakatAcademyQuiz as Quiz;
use App\Modules\Academy\Models\ZakatAcademyQuizAttempt as Attempt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CohortLearning
{
    public function owns(string $profileId, string $cohortId): bool
    {
        return Membership::where('profile_id', $profileId)->where('cohort_id', $cohortId)->exists();
    }

    public function enrollCourses(string $profileId, string $cohortId): void
    {
        foreach (Course::where('cohort_id', $cohortId)->pluck('id') as $id) {
            if (! Enrollment::where('profile_id', $profileId)->where('course_id', $id)->exists()) {
                $row = new Enrollment;
                $row->profileId = $profileId;
                $row->courseId = $id;
                $row->save();
            }
        }
    }

    public function finished(string $profileId, string $cohortId): bool
    {
        $quizzes = Quiz::where('is_published', true)->whereHas('chapter', fn ($q) => $q->where('is_published', true)->whereHas('course', fn ($c) => $c->where('cohort_id', $cohortId)->where('is_published', true)))->get(['id', 'kind']);
        return $quizzes->contains('kind', 'FINAL') && $quizzes->count() === Attempt::where('profile_id', $profileId)->where('is_completed', true)->whereIn('quiz_id', $quizzes->pluck('id'))->distinct()->count('quiz_id');
    }

    public function join(Profile $profile, Cohort $cohort): void
    {
        // Call inside a transaction. Lock the participant before checking prior
        // memberships so simultaneous requests cannot join two active cohorts.
        Profile::where('id', $profile->id)->lockForUpdate()->firstOrFail();
        if ($this->owns($profile->id, $cohort->id)) {
            $this->enrollCourses($profile->id, $cohort->id);
            return;
        }
        foreach (Membership::where('profile_id', $profile->id)->whereNull('finished_at')->lockForUpdate()->get() as $old) {
            abort_unless($this->finished($profile->id, $old->cohortId), 409, 'Selesaikan seluruh ujian hingga ujian akhir pada angkatan sebelumnya sebelum mendaftar lagi.');
            $old->finishedAt = now();
            $old->save();
        }
        $membership = new Membership;
        $membership->profileId = $profile->id;
        $membership->cohortId = $cohort->id;
        $membership->joinedAt = now();
        $membership->save();
        $profile->cohortId = $cohort->id;
        $profile->save();
        $this->enrollCourses($profile->id, $cohort->id);
    }

    public function container(string $cohortId): Chapter
    {
        $cohort = Cohort::where('id', $cohortId)->lockForUpdate()->firstOrFail();
        $slug = 'materi-angkatan-'.substr(hash('sha256', $cohort->id), 0, 24);
        $course = Course::where('slug', $slug)->first();
        $created = ! $course;
        if (! $course) {
            $course = new Course;
            $course->forceFill(['cohortId' => $cohort->id, 'title' => $cohort->title, 'slug' => $slug, 'shortDescription' => 'Materi '.$cohort->title, 'teacher' => 'Ustadz Irham', 'isPublished' => true, 'registrationOpen' => false, 'isSimulation' => false, 'startsAt' => now()->startOfDay()])->save();
        }
        $chapter = $course->chapters()->where('slug', 'materi')->first();
        if (! $chapter) {
            $chapter = new Chapter;
            $chapter->forceFill(['courseId' => $course->id, 'title' => $cohort->title, 'slug' => 'materi', 'order' => 0, 'isPublished' => true])->save();
        }
        if ($created) {
            Membership::where('cohort_id', $cohortId)->orderBy('id')->chunk(500, function ($memberships) use ($course) {
                DB::table('zakat_academy_enrollments')->insertOrIgnore($memberships->map(fn ($membership) => [
                    'id' => (string) Str::uuid(), 'profile_id' => $membership->profileId,
                    'course_id' => $course->id, 'created_at' => $membership->joinedAt,
                ])->all());
            });
        }
        return $chapter;
    }
}
