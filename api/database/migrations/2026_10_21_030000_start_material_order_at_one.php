<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::transaction(function () {
            $rows = DB::table('zakat_academy_lessons as l')
                ->join('zakat_academy_chapters as ch', 'ch.id', '=', 'l.chapter_id')
                ->join('zakat_academy_courses as c', 'c.id', '=', 'ch.course_id')
                ->select('l.id', 'l.order', 'c.cohort_id')->get()->groupBy('cohort_id');
            foreach ($rows as $group) {
                if ($group->min('order') > 0) {
                    continue;
                }
                foreach ($group as $lesson) {
                    DB::table('zakat_academy_lessons')->where('id', $lesson->id)->update(['order' => $lesson->order + 1]);
                }
            }
        });
    }

    public function down(): void
    {
        // Existing positive orders cannot be distinguished from shifted orders.
    }
};
