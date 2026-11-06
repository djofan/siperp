<?php

use App\Modules\Academy\Models\AcademyCohort;
use App\Modules\Academy\Models\ZakatAcademyCourse;
use App\Modules\Academy\Models\ZakatAcademyProfile;
use App\Modules\Core\Models\User;

it('migrates existing participants from their first program while retaining enrollments', function () {
    $this->artisan('migrate')->assertSuccessful();
    $user = new User;
    $user->forceFill(['name' => 'Legacy student', 'email' => 'legacy@cohort.test', 'password_hash' => bcrypt('test-password')])->save();
    $scoping = require database_path('migrations/2026_10_20_010000_scope_academy_learning_to_cohorts.php');
    $scoping->down();
    $migration = require database_path('migrations/2026_10_20_000000_create_academy_cohorts.php');
    $migration->down();
    $first = new ZakatAcademyCourse;
    $first->forceFill(['title' => 'Angkatan Lama', 'slug' => 'old-cohort', 'shortDescription' => 'Materi', 'teacher' => 'Pengajar', 'isPublished' => true, 'registrationOpen' => true])->save();
    $second = new ZakatAcademyCourse;
    $second->forceFill(['title' => 'Program Lain', 'slug' => 'other-course', 'shortDescription' => 'Materi', 'teacher' => 'Pengajar'])->save();
    $profile = new ZakatAcademyProfile;
    $user = User::firstOrFail();
    $profile->userId = $user->id;
    $profile->save();
    foreach ([$first, $second] as $index => $course) {
        $enrollment = new \App\Modules\Academy\Models\ZakatAcademyEnrollment;
        $enrollment->profileId = $profile->id;
        $enrollment->courseId = $course->id;
        $enrollment->createdAt = now()->subDays(2 - $index);
        $enrollment->save();
    }
    $migration->up();
    $scoping->up();
    expect($profile->fresh()->cohortId)->toBe($first->id)
        ->and($profile->enrollments()->count())->toBe(2)
        ->and(AcademyCohort::findOrFail($first->id)->participants()->count())->toBe(1);
});
