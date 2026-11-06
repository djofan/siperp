<?php

namespace App\Modules\Academy\Http\Controllers;

use App\Modules\Academy\Models\ZakatAcademyChapter as Chapter;
use App\Modules\Academy\Models\ZakatAcademyCourse as Course;
use App\Modules\Academy\Models\ZakatAcademyEnrollment as Enrollment;
use App\Modules\Academy\Models\ZakatAcademyLesson as Lesson;
use App\Modules\Academy\Models\ZakatAcademyLessonAttachment as Attachment;
use App\Modules\Academy\Models\ZakatAcademyProfile as Profile;
use App\Modules\Academy\Models\AcademyCohort as Cohort;
use App\Modules\Academy\Models\ZakatAcademyQuiz as Quiz;
use App\Modules\Academy\Services\CohortLearning;
use App\Modules\Academy\Services\AcademyContext;
use App\Modules\Academy\Services\AcademyDto;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MaterialController
{
    public function __construct(private AcademyContext $context, private CurriculumController $curriculum) {}

    private function published(?Request $request = null)
    {
        $query = Lesson::where('is_published', true)->whereHas('chapter', fn ($q) => $q->where('is_published', true)->whereHas('course', fn ($c) => $c->where('is_published', true)->whereNotNull('cohort_id')));
        $actor = $request?->user() ?? auth('sanctum')->user();
        if (! $actor?->is_superadmin) {
            $profile = $actor ? Profile::where('user_id', $actor->id)->whereNull('deleted_at')->first() : null;
            $query->whereHas('chapter.course', fn ($c) => $c->whereIn('cohort_id', DB::table('academy_cohort_memberships')->where('profile_id', $profile?->id ?? '')->select('cohort_id')));
        }
        return $query;
    }

    public function index(Request $request, bool $admin = false)
    {
        if ($admin) {
            $this->context->admin($request);
        }
        $query = $admin ? Lesson::query() : $this->published($request);
        if ($request->input('cohort') === 'unassigned' && $admin) {
            $query->whereHas('chapter.course', fn ($c) => $c->whereNull('cohort_id'));
        } elseif ($request->filled('cohort')) {
            $query->whereHas('chapter.course', fn ($c) => $c->where('cohort_id', $request->input('cohort')));
        }
        $maxOrder = $admin ? (clone $query)->max('order') : null;
        $nextOrder = $maxOrder === null ? 1 : max(1, $maxOrder + 1);
        if ($request->filled('search')) {
            $query->where('title', 'like', '%'.mb_substr($request->input('search'), 0, 100).'%');
        }
        if ($admin && in_array($request->input('status'), ['published', 'draft'], true)) {
            $query->where('is_published', $request->input('status') === 'published');
        }
        $query->select('id', 'chapter_id', 'title', 'slug', 'short_description', 'video_provider', 'is_published', 'order', 'release_day')
            ->with('chapter:id,course_id,is_published', 'chapter.course:id,slug,is_published,cohort_id', 'chapter.course.cohort:id,title')->withCount('attachments')->orderBy('order')->orderBy('id');

        if ($admin) {
            $query->addSelect('video_url')->with('attachments:id,lesson_id,title,file_url,file_type');
        }

        if ($admin && $request->boolean('all')) {
            $items = $query->get()->map(fn ($row) => AcademyDto::make($row));
            return response()->json(['data' => ['items' => $items, 'total' => $items->count(), 'page' => 1, 'pages' => 1, 'nextOrder' => $nextOrder]]);
        }
        return response()->json(['data' => AcademyDto::page($query, (int) $request->input('page', 1)) + ['nextOrder' => $nextOrder]]);
    }

    public function adminIndex(Request $request)
    {
        return $this->index($request, true);
    }

    public function show(Request $request, string $id)
    {
        return response()->json(['data' => $this->published($request)->select('id', 'chapter_id', 'title', 'slug', 'short_description')->with('chapter:id,course_id', 'chapter.course:id,slug,cohort_id', 'chapter.course.cohort:id,title')->findOrFail($id)]);
    }

    public function adminShow(Request $request, string $id)
    {
        $this->context->admin($request);

        return response()->json(['data' => Lesson::with('chapter:id,title,course_id,is_published', 'chapter.course:id,is_published,cohort_id', 'chapter.course.cohort:id,title', 'attachments')->findOrFail($id)]);
    }

    // Legacy parent rows remain internal so existing progress and quiz records
    // retain their identifiers. Editors create materials directly.
    private function container(string $cohortId): Chapter
    {
        return app(CohortLearning::class)->container($cohortId);
    }

    public function save(Request $request, ?string $id = null)
    {
        $this->context->admin($request);
        $request->validate(['file' => 'sometimes|file|max:51200']);
        $storedPath = null;
        try {
        $lesson = DB::transaction(function () use ($id, $request, &$storedPath) {
            $lesson = $id ? Lesson::where('id', $id)->lockForUpdate()->firstOrFail() : new Lesson;
            $currentCohort = $id ? $lesson->chapter->course->cohortId : null;
            $cohortId = $request->validate(['cohortId' => ($currentCohort ? 'sometimes' : 'required').'|string|exists:academy_cohorts,id'])['cohortId'] ?? $currentCohort;
            abort_if($currentCohort && $currentCohort !== $cohortId, 422, 'Gunakan Duplikat untuk menyalin materi ke angkatan lain.');
            $defaults = [
                'title' => $lesson->title, 'order' => $lesson->order ?? 1,
                'slug' => $lesson->slug ?? (mb_substr(Str::slug($request->input('title', 'audio')), 0, 110) ?: 'audio').'-'.Str::uuid(),
                'videoProvider' => $lesson->videoProvider ?? 'AUDIO', 'videoUrl' => $lesson->videoUrl ?? '',
                'shortDescription' => $lesson->shortDescription, 'thumbnailUrl' => $lesson->thumbnailUrl,
                'contentSummary' => $lesson->contentSummary, 'releaseDay' => $lesson->releaseDay ?? 1,
                'isPublished' => $lesson->isPublished ?? false,
            ];
            $request->merge(array_replace($defaults, $request->all()));
            $request->validate(['order' => 'required|integer|min:1|max:2147483647']);
            $publishAfterUpload = $request->hasFile('file') && in_array($request->input('isPublished'), ['on', '1', 1, true], true);
            if ($request->hasFile('file')) {
                $request->merge(['isPublished' => false]);
            }
            $data = $this->curriculum->lessonInput($request);
            if (! $id || ! $currentCohort) {
                abort_if($id && ($lesson->lessonProgress()->exists() || $lesson->chapter->course->enrollments()->exists()), 409, 'Materi arsip memiliki riwayat. Duplikat ke angkatan tujuan untuk menjaga riwayat lama.');
                $lesson->chapterId = $this->container($cohortId)->id;
            }
            foreach ($data as $key => $value) {
                $lesson->$key = $value;
            }
            $lesson->save();
            if ($request->hasFile('file')) {
                $upload = app(FileController::class)->storeFile($lesson, $request->file('file'), true);
                $storedPath = $upload['storagePath'];
                $lesson->refresh();
                $lesson->isPublished = $publishAfterUpload;
                $lesson->save();
            }

            return $lesson;
        }, $request->hasFile('file') ? 1 : 3);
        } catch (\Throwable $error) {
            if ($storedPath) { Storage::disk('local')->delete($storedPath); }
            throw $error;
        }

        return response()->json(['data' => ['id' => $lesson->id]]);
    }

    public function destroy(Request $request, string $id)
    {
        $this->context->admin($request);
        $lesson = Lesson::with('chapter')->findOrFail($id);

        return $this->curriculum->destroy($request, $lesson->chapter->courseId, $lesson->chapterId, $lesson->id);
    }

    public function saveExam(Request $request, ?string $id = null)
    {
        $this->context->admin($request);
        $request->merge(['isPublished' => $request->boolean('isActive'), 'allowRetake' => false]);
        $result = DB::transaction(function () use ($request, $id) {
            $quiz = $id ? Quiz::where('id', $id)->lockForUpdate()->firstOrFail() : null;
            $chapter = $quiz ? $quiz->chapter : $this->container($request->validate(['cohortId' => 'required|string|exists:academy_cohorts,id'])['cohortId']);
            $questions = $request->input('questions');
            if ($questions === null) {
                $questions = [array_merge($request->only(['question', 'type', 'options', 'explanation']), ['id' => $quiz?->questions()->value('id')])];
            }
            $request->merge(['questions' => $questions]);
            $request->validate(['questions' => 'required|array|min:1|max:100', 'questions.*' => 'required|array', 'questions.*.id' => 'nullable|string|max:191']);
            $ids = array_values(array_filter(array_column($questions, 'id')));
            abort_if(count($ids) !== count(array_unique($ids)), 422, 'Pertanyaan tidak boleh berulang.');
            $owned = $quiz ? $quiz->questions()->pluck('id')->all() : [];
            abort_if(array_diff($ids, $owned) !== [], 422, 'Pertanyaan bukan milik ujian ini.');
            $settings = $this->curriculum->quizInput($request);
            $draft = clone $request;
            $draft->merge(['isPublished' => false, 'isActive' => false]);
            $saved = $this->curriculum->persistQuiz($draft, $chapter->courseId, $chapter->id, $id)->getData(true)['data'];
            $quiz = Quiz::findOrFail($saved['id']);
            $retained = [];
            foreach (array_values($questions) as $index => $question) {
                $questionRequest = clone $request;
                $questionRequest->merge(array_merge($question, ['order' => $index + 1, 'weight' => 1]));
                $savedQuestion = $this->curriculum->persistQuestion($questionRequest, $chapter->courseId, $chapter->id, $quiz->id, $question['id'] ?? null)->getData(true)['data'];
                $retained[] = $savedQuestion['id'];
            }
            $quiz->questions()->whereNotIn('id', $retained)->delete();
            if ($settings['isPublished']) {
                $this->curriculum->ready($quiz);
            }
            $quiz->isPublished = $settings['isPublished'];
            $quiz->isActive = $settings['isActive'];
            $quiz->save();
            return ['id' => $quiz->id, 'courseId' => $chapter->courseId, 'chapterId' => $chapter->id];
        }, 3);
        return response()->json(['data' => $result]);
    }

    public function createQuiz(Request $request)
    {
        $this->context->admin($request);
        $result = DB::transaction(function () use ($request) {
            $cohortId = $request->validate(['cohortId' => 'required|string|exists:academy_cohorts,id'])['cohortId'];
            $chapter = $this->container($cohortId);
            $result = $this->curriculum->persistQuiz($request, $chapter->courseId, $chapter->id, null);

            return $result->getData(true)['data'] + ['courseId' => $chapter->courseId, 'chapterId' => $chapter->id];
        }, 3);

        return response()->json(['data' => $result]);
    }

    public function start(Request $request, string $id)
    {
        $profile = $this->context->profile($request);
        $lesson = $this->published($request)->with('chapter.course')->findOrFail($id);
        $course = $lesson->chapter->course;
        abort_unless(app(CohortLearning::class)->owns($profile->id, $course->cohortId), 403, 'Anda belum terdaftar pada angkatan ini.');
        DB::transaction(function () use ($profile, $course) {
            Course::where('id', $course->id)->lockForUpdate()->firstOrFail();
            if (! Enrollment::where('profile_id', $profile->id)->where('course_id', $course->id)->exists()) {
                $enrollment = new Enrollment;
                $enrollment->profileId = $profile->id;
                $enrollment->courseId = $course->id;
                $enrollment->save();
            }
        }, 3);

        return response()->json(['data' => ['id' => $lesson->id]]);
    }

    public function duplicate(Request $request, string $id)
    {
        $this->context->admin($request);
        $target = $request->validate(['cohortId' => 'required|string|exists:academy_cohorts,id'])['cohortId'];
        $copy = DB::transaction(function () use ($id, $target) {
            $source = Lesson::with('chapter.course', 'attachments')->where('id', $id)->lockForUpdate()->firstOrFail();
            abort_if($source->chapter->course->cohortId === $target, 422, 'Pilih angkatan tujuan yang berbeda.');
            $copy = $source->replicate(['id', 'created_at', 'updated_at']);
            $copy->unsetRelations();
            $copy->chapterId = $this->container($target)->id;
            $copy->slug = 'audio-'.Str::uuid();
            $copy->isPublished = false;
            $copy->save();
            foreach ($source->attachments as $old) {
                $file = $old->replicate(['id', 'created_at']);
                $file->unsetRelations();
                $file->id = (string) Str::uuid();
                $file->lessonId = $copy->id;
                if ($old->fileUrl === '/api/academy/files/'.$old->id && isset(FileController::EXTENSIONS[$old->fileType])) {
                    $file->storagePath = $old->storagePath ?: 'academy/'.$old->id.'.'.FileController::EXTENSIONS[$old->fileType];
                    $file->fileUrl = '/api/academy/files/'.$file->id;
                    if ($copy->videoUrl === $old->fileUrl) {
                        $copy->videoUrl = $file->fileUrl;
                    }
                }
                $file->save();
            }
            $copy->save();
            return $copy;
        }, 3);
        return response()->json(['data' => ['id' => $copy->id]]);
    }
}
