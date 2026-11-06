<?php

namespace App\Modules\Academy\Http\Controllers;

use App\Modules\Academy\Models\ZakatAcademyChapter as Chapter;
use App\Modules\Academy\Models\ZakatAcademyLesson as Lesson;
use App\Modules\Academy\Models\ZakatAcademyQuiz as Quiz;
use App\Modules\Academy\Services\AcademyContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class TeacherController
{
    public function __construct(private AcademyContext $context, private CurriculumController $curriculum) {}

    public function material(Request $request, ?string $id = null)
    {
        $this->context->teacher($request);
        $chapterId = $request->validate(['chapterId' => 'required|string'])['chapterId'];
        Chapter::findOrFail($chapterId);
        $row = $id ? Lesson::where('id', $id)->where('chapter_id', $chapterId)->firstOrFail() : new Lesson;
        $request->merge(['videoProvider' => 'AUDIO', 'slug' => $row->exists ? $row->slug : 'materi-'.Str::uuid()]);
        $data = $this->curriculum->lessonInput($request);
        DB::transaction(function () use ($row, $chapterId, $data) {
            foreach ($data as $key => $value) {
                $row->$key = $value;
            } $row->chapterId = $chapterId;
            $row->save();
        });

        return response()->json(['data' => ['error' => '', 'id' => $row->id]]);
    }

    public function quiz(Request $request, ?string $id = null)
    {
        $this->context->teacher($request);
        $chapterId = $request->validate(['chapterId' => 'required|string'])['chapterId'];
        $chapter = Chapter::findOrFail($chapterId);

        return $this->curriculum->persistQuiz($request, $chapter->courseId, $chapterId, $id);
    }

    public function question(Request $request, string $quizId, ?string $id = null)
    {
        $this->context->teacher($request);
        $quiz = Quiz::with('chapter')->findOrFail($quizId);

        return $this->curriculum->persistQuestion($request, $quiz->chapter->courseId, $quiz->chapterId, $quizId, $id);
    }
}
