<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('zakat_academy_lesson_attachments', function (Blueprint $table) {
            $table->string('storage_path', 191)->nullable();
        });
        Schema::table('zakat_academy_courses', function (Blueprint $table) {
            $table->string('cohort_id', 191)->nullable()->index();
        });
        Schema::create('academy_cohort_memberships', function (Blueprint $table) {
            $table->string('id', 191)->primary();
            $table->string('cohort_id', 191)->index();
            $table->string('profile_id', 191)->index();
            $table->dateTime('joined_at', 3)->useCurrent();
            $table->dateTime('finished_at', 3)->nullable();
            $table->unique(['cohort_id', 'profile_id']);
            $table->foreign('cohort_id')->references('id')->on('academy_cohorts')->restrictOnDelete();
            $table->foreign('profile_id')->references('id')->on('zakat_academy_profiles')->restrictOnDelete();
        });
        foreach (DB::table('academy_cohorts')->get() as $cohort) {
            DB::table('zakat_academy_courses')->where('id', $cohort->id)->update(['cohort_id' => $cohort->id]);
        }
        // A shared legacy library cannot be attributed to multiple cohorts by
        // guessing. Keep it in the admin archive unless there is just one cohort.
        if (DB::table('academy_cohorts')->count() === 1) {
            DB::table('zakat_academy_courses')->where('slug', 'academy-materi')->update(['cohort_id' => DB::table('academy_cohorts')->value('id')]);
        }
        $join = function ($profileId, $cohortId, $date) {
            DB::table('academy_cohort_memberships')->insertOrIgnore(['id' => (string) Str::uuid(), 'profile_id' => $profileId, 'cohort_id' => $cohortId, 'joined_at' => $date ?? now()]);
        };
        foreach (DB::table('zakat_academy_profiles')->whereNotNull('cohort_id')->get() as $profile) {
            $join($profile->id, $profile->cohort_id, $profile->created_at);
        }
        foreach (DB::table('zakat_academy_enrollments as e')->join('zakat_academy_courses as c', 'c.id', '=', 'e.course_id')->whereNotNull('c.cohort_id')->get(['e.profile_id', 'c.cohort_id', 'e.created_at']) as $row) {
            $join($row->profile_id, $row->cohort_id, $row->created_at);
        }
        foreach (DB::table('academy_cohort_memberships')->get() as $membership) {
            foreach (DB::table('zakat_academy_courses')->where('cohort_id', $membership->cohort_id)->pluck('id') as $courseId) {
                DB::table('zakat_academy_enrollments')->insertOrIgnore(['id' => (string) Str::uuid(), 'profile_id' => $membership->profile_id, 'course_id' => $courseId, 'created_at' => $membership->joined_at]);
            }
        }
    }

    public function down(): void
    {
        Schema::table('zakat_academy_lesson_attachments', fn (Blueprint $table) => $table->dropColumn('storage_path'));
        Schema::dropIfExists('academy_cohort_memberships');
        Schema::table('zakat_academy_courses', function (Blueprint $table) {
            $table->dropIndex(['cohort_id']);
            $table->dropColumn('cohort_id');
        });
    }
};
