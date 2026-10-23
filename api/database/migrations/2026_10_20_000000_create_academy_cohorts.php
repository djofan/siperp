<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('academy_cohorts', function (Blueprint $table) {
            $table->string('id', 191)->primary();
            $table->string('title', 191)->unique();
            $table->unsignedInteger('quota')->default(200);
            $table->boolean('registration_open')->default(false);
            $table->timestamps(3);
        });
        Schema::withoutForeignKeyConstraints(fn () => Schema::table('zakat_academy_profiles', function (Blueprint $table) {
            $table->string('cohort_id', 191)->nullable()->index();
            $table->foreign('cohort_id')->references('id')->on('academy_cohorts')->restrictOnDelete();
        }));

        // Preserve the old course-based cohorts; use the earliest enrollment
        // when a participant previously joined more than one program.
        $open = false;
        foreach (DB::table('zakat_academy_courses')->where('is_simulation', false)->orderBy('created_at')->orderBy('id')->get() as $course) {
            $title = $course->title;
            if (DB::table('academy_cohorts')->where('title', $title)->exists()) {
                $title = mb_substr($title, 0, 160).' ('.substr(hash('sha256', $course->id), 0, 12).')';
            }
            $accepting = ! $open && $course->registration_open && $course->is_published && (! $course->starts_at || $course->starts_at > now());
            DB::table('academy_cohorts')->insert([
                'id' => $course->id, 'title' => $title, 'quota' => $course->quota,
                'registration_open' => $accepting, 'created_at' => $course->created_at, 'updated_at' => now(),
            ]);
            $open = $open || $accepting;
        }
        foreach (DB::table('zakat_academy_enrollments')->orderBy('created_at')->orderBy('id')->get() as $enrollment) {
            if (DB::table('academy_cohorts')->where('id', $enrollment->course_id)->exists()) {
                DB::table('zakat_academy_profiles')->where('id', $enrollment->profile_id)->whereNull('cohort_id')->update(['cohort_id' => $enrollment->course_id]);
            }
        }
    }

    public function down(): void
    {
        Schema::withoutForeignKeyConstraints(fn () => Schema::table('zakat_academy_profiles', function (Blueprint $table) {
            $table->dropForeign(['cohort_id']);
            $table->dropIndex(['cohort_id']);
            $table->dropColumn('cohort_id');
        }));
        Schema::dropIfExists('academy_cohorts');
    }
};
