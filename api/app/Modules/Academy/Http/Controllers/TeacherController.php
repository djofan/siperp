<?php

namespace App\Modules\Academy\Http\Controllers;

use App\Modules\Academy\Models\ZakatAcademyChapter as Chapter;
use App\Modules\Academy\Models\ZakatAcademyLesson as Lesson;
use App\Modules\Academy\Models\ZakatAcademyQuiz as Quiz;
use App\Modules\Academy\Services\AcademyContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
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
        // Daily teaching: no manual release schedule or positioning in this form.
        $request->merge(['releaseDay' => 1, 'order' => $row->exists ? $row->order : 0]);
        $request->validate(['file' => 'nullable|file|max:51200']);
        $hasFile = $request->hasFile('file');
        $published = $request->boolean('isPublished');
        // Keep the existing audio when editing without a replacement.
        $request->merge(['videoUrl' => $request->input('videoUrl', $row->videoUrl ?? '')]);
        if ($hasFile) {
            $request->merge(['isPublished' => false]);
        }
        $data = $this->curriculum->lessonInput($request);
        $storedPath = null;
        try {
            DB::transaction(function () use ($row, $chapterId, $data, $request, $hasFile, $published, &$storedPath) {
                Chapter::whereKey($chapterId)->lockForUpdate()->firstOrFail();
                if (! $row->exists) {
                    $data['order'] = (int) Lesson::where('chapter_id', $chapterId)->max('order') + 1;
                }
                foreach ($data as $key => $value) {
                    $row->$key = $value;
                } $row->chapterId = $chapterId;
                $row->save();
                if ($hasFile) {
                    $upload = app(FileController::class)->storeFile($row, $request->file('file'), true);
                    $storedPath = $upload['storagePath'];
                    $row->refresh();
                    $row->isPublished = $published;
                    $row->save();
                }
            });
        } catch (\Throwable $error) {
            if ($storedPath) {
                Storage::disk('local')->delete($storedPath);
            }
            throw $error;
        }

        return response()->json(['data' => ['error' => '', 'id' => $row->id]]);
    }

    public function quiz(Request $request, ?string $id = null)
    {
        $this->context->teacher($request);
        $input = $request->validate([
            'kind' => 'sometimes|in:DAILY,WEEKLY,FINAL',
            'chapterId' => 'nullable|string|max:191',
            'courseId' => 'nullable|string|max:191',
        ]);
        $kind = $input['kind'] ?? 'DAILY';
        $existing = $id ? Quiz::findOrFail($id) : null;
        if ($kind === 'DAILY') {
            abort_unless(! empty($input['chapterId']), 422, 'Pilih bab untuk ujian harian.');
            $chapter = Chapter::findOrFail($input['chapterId']);
        } elseif ($existing) {
            // Keep the existing curriculum relationship and attempt history on edit.
            $chapter = $existing->chapter;
        } elseif (! empty($input['courseId'])) {
            // Weekly/final exams belong to the cohort curriculum. A chapter remains
            // an internal FK for compatibility, not a choice the teacher must make.
            $chapter = Chapter::where('course_id', $input['courseId'])->orderByDesc('is_published')->orderBy('order')->orderBy('id')->first();
            abort_unless($chapter, 422, 'Angkatan belum memiliki bab. Minta admin menyiapkan kurikulum angkatan.');
        } else {
            // Retain support for existing API clients that send chapterId.
            abort_unless(! empty($input['chapterId']), 422, 'Pilih angkatan untuk ujian ini.');
            $chapter = Chapter::findOrFail($input['chapterId']);
        }
        abort_if(! empty($input['courseId']) && $chapter->courseId !== $input['courseId'], 422, 'Bab tidak sesuai dengan angkatan.');
        abort_if($existing && $existing->chapterId !== $chapter->id, 422, 'Bab ujian yang sudah dibuat tidak dapat dipindahkan.');

        return $this->curriculum->persistQuiz($request, $chapter->courseId, $chapter->id, $id);
    }

    public function question(Request $request, string $quizId, ?string $id = null)
    {
        $this->context->teacher($request);
        $quiz = Quiz::with('chapter')->findOrFail($quizId);

        return $this->curriculum->persistQuestion($request, $quiz->chapter->courseId, $quiz->chapterId, $quizId, $id);
    }
}
