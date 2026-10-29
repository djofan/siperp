<?php

namespace App\Modules\Academy\Http\Controllers;

use App\Modules\Academy\Models\ZakatAcademyChapter as Chapter;
use App\Modules\Academy\Models\ZakatAcademyCourse as Course;
use App\Modules\Academy\Models\ZakatAcademyLesson as Lesson;
use App\Modules\Academy\Models\ZakatAcademyLessonAttachment as Attachment;
use App\Modules\Academy\Models\ZakatAcademyQuiz as Quiz;
use App\Modules\Academy\Models\ZakatAcademyQuizOption as Option;
use App\Modules\Academy\Models\ZakatAcademyQuizQuestion as Question;
use App\Modules\Academy\Services\AcademyContext;
use App\Modules\Academy\Services\AcademyDto;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CurriculumController
{
    public function __construct(private AcademyContext $context) {}

    private function data($data)
    {
        return response()->json(['data' => $data]);
    }

    private function course(string $id)
    {
        return Course::where('id', $id)->lockForUpdate()->firstOrFail();
    }

    private function chapter(string $courseId, string $id)
    {
        return Chapter::where('id', $id)->where('course_id', $courseId)->firstOrFail();
    }

    private function lesson(string $courseId, string $chapterId, string $id)
    {
        $this->chapter($courseId, $chapterId);

        return Lesson::where('id', $id)->where('chapter_id', $chapterId)->firstOrFail();
    }

    private function quiz(string $courseId, string $chapterId, string $id)
    {
        $this->chapter($courseId, $chapterId);

        return Quiz::where('id', $id)->where('chapter_id', $chapterId)->lockForUpdate()->firstOrFail();
    }

    private function assign($row, array $data)
    {
        foreach ($data as $key => $value) {
            $row->$key = $value;
        } $row->save();

        return ['id' => $row->id];
    }

    private function published(Request $request, string $key): bool
    {
        return in_array($request->input($key), ['on', '1', 1, true], true);
    }

    private function url(?string $url): ?string
    {
        abort_unless($this->context->safeUrl($url), 422, 'Gunakan URL HTTPS atau path lokal yang valid.');

        return $url ?: null;
    }

    private function common(Request $request): array
    {
        $data = $request->validate(['title' => 'required|string|max:191', 'slug' => ['required', 'string', 'max:160', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/'], 'order' => 'required|integer|min:0|max:2147483647']);

        return $data + ['isPublished' => $this->published($request, 'isPublished')];
    }

    public function stats(Request $request)
    {
        $this->context->admin($request);

        return $this->data(['courses' => Course::count(), 'published' => Course::where('is_published', true)->count(), 'chapters' => Chapter::count(), 'lessons' => Lesson::count()]);
    }

    public function index(Request $request)
    {
        $this->context->admin($request);
        $query = Course::query();
        if ($request->filled('search')) {
            $query->where('title', 'like', '%'.mb_substr($request->input('search'), 0, 100).'%');
        }
        if (in_array($request->input('status'), ['published', 'draft'], true)) {
            $query->where('is_published', $request->input('status') === 'published');
        }

        return $this->data(AcademyDto::page($query->select('id', 'title', 'slug', 'order', 'is_published')->withCount(['chapters', 'enrollments'])->orderBy('order')->orderBy('id'), (int) $request->input('page', 1)));
    }

    public function show(Request $request, string $courseId)
    {
        $this->context->admin($request);

        return $this->data(AcademyDto::make(Course::with(['chapters' => fn ($q) => $q->withCount(['lessons', 'quizzes'])->orderBy('order')->orderBy('id')])->findOrFail($courseId)));
    }

    public function showChapter(Request $request, string $courseId, string $chapterId)
    {
        $this->context->admin($request);
        $row = $this->chapter($courseId, $chapterId);
        $row->load(['course:id,title', 'quizzes' => fn ($q) => $q->withCount('questions')->orderByDesc('created_at'), 'lessons' => fn ($q) => $q->withCount('attachments')->orderBy('order')->orderBy('id')]);

        return $this->data(AcademyDto::make($row));
    }

    public function showLesson(Request $request, string $courseId, string $chapterId, string $lessonId)
    {
        $this->context->admin($request);

        return $this->data(AcademyDto::make($this->lesson($courseId, $chapterId, $lessonId)->load(['chapter:id,title', 'attachments' => fn ($q) => $q->orderBy('created_at')->orderBy('id')])));
    }

    public function saveCourse(Request $request, ?string $courseId = null)
    {
        $this->context->admin($request);
        $data = $this->common($request) + $request->validate(['shortDescription' => 'required|string|max:2000', 'description' => 'nullable|string|max:30000', 'thumbnailUrl' => 'nullable|string|max:2048', 'materialUrl' => 'nullable|string|max:2048']);
        foreach (['thumbnailUrl', 'materialUrl'] as $key) {
            $data[$key] = $this->url($data[$key] ?? null);
        }

        return $this->data(DB::transaction(fn () => $this->assign($courseId ? $this->course($courseId) : new Course, $data), 3));
    }

    public function saveChapter(Request $request, string $courseId, ?string $chapterId = null)
    {
        $this->context->admin($request);
        $data = $this->common($request) + $request->validate(['description' => 'nullable|string|max:30000']);

        return $this->data(DB::transaction(function () use ($courseId, $chapterId, $data) {
            $this->course($courseId);

            return $this->assign($chapterId ? $this->chapter($courseId, $chapterId) : new Chapter, $data + ['courseId' => $courseId]);
        }, 3));
    }

    public function lessonInput(Request $request): array
    {
        $data = $this->common($request) + $request->validate(['videoProvider' => 'required|in:AUDIO,YOUTUBE,VIMEO,BUNNY', 'videoUrl' => 'nullable|string|max:2048', 'shortDescription' => 'nullable|string|max:2000', 'contentSummary' => 'nullable|string|max:30000', 'thumbnailUrl' => 'nullable|string|max:2048', 'releaseDay' => 'sometimes|integer|min:1|max:30']);
        $data['videoUrl'] = $data['videoUrl'] ?? '';
        $data['releaseDay'] = $data['releaseDay'] ?? 1;
        $data['thumbnailUrl'] = $this->url($data['thumbnailUrl'] ?? null);
        abort_if($data['isPublished'] && ! $data['videoUrl'] && empty($data['contentSummary']), 422, 'Isi teks atau audio sebelum publikasi.');
        if ($data['videoProvider'] === 'AUDIO') {
            $this->url($data['videoUrl']);
        } else {
            $url = parse_url($data['videoUrl']);
            $host = strtolower($url['host'] ?? '');
            $allowed = ['YOUTUBE' => ['youtube.com', 'www.youtube.com', 'youtu.be', 'www.youtube-nocookie.com'], 'VIMEO' => ['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'], 'BUNNY' => ['iframe.mediadelivery.net', 'player.mediadelivery.net']];
            abort_unless($this->context->safeUrl($data['videoUrl']) && in_array($host, $allowed[$data['videoProvider']], true), 422, 'URL materi tidak cocok dengan provider.');
            parse_str($url['query'] ?? '', $query);
            $segments = explode('/', trim($url['path'] ?? '', '/'));
            $id = $host === 'youtu.be' ? ($segments[0] ?? '') : ($query['v'] ?? end($segments));
            abort_if($data['videoProvider'] === 'YOUTUBE' && ! preg_match('/^[\w-]{11}$/', $id), 422, 'ID video tidak valid.');
            abort_if($data['videoProvider'] === 'VIMEO' && ! ctype_digit((string) end($segments)), 422, 'ID video tidak valid.');
            abort_if($data['videoProvider'] === 'BUNNY' && ! str_starts_with($url['path'] ?? '', '/embed/'), 422, 'URL embed tidak valid.');
        }

        return $data;
    }

    public function saveLesson(Request $request, string $courseId, string $chapterId, ?string $lessonId = null)
    {
        $this->context->admin($request);
        $data = $this->lessonInput($request);

        return $this->data(DB::transaction(function () use ($courseId, $chapterId, $lessonId, $data) {
            $this->course($courseId);
            $this->chapter($courseId, $chapterId);

            return $this->assign($lessonId ? $this->lesson($courseId, $chapterId, $lessonId) : new Lesson, $data + ['chapterId' => $chapterId]);
        }, 3));
    }

    public function saveAttachment(Request $request, string $courseId, string $chapterId, string $lessonId, ?string $id = null)
    {
        $this->context->admin($request);
        $data = $request->validate(['title' => 'required|string|max:191', 'fileUrl' => 'required|string|max:2048', 'fileType' => 'nullable|string|max:100', 'fileSize' => 'nullable|integer|min:0|max:2147483647']);
        $data['fileUrl'] = $this->url($data['fileUrl']);

        return $this->data(DB::transaction(function () use ($courseId, $chapterId, $lessonId, $id, $data) {
            $this->course($courseId);
            $this->lesson($courseId, $chapterId, $lessonId);

            return $this->assign($id ? Attachment::where('id', $id)->where('lesson_id', $lessonId)->firstOrFail() : new Attachment, $data + ['lessonId' => $lessonId]);
        }, 3));
    }

    public function order(Request $request, string $courseId, string $chapterId, ?string $lessonId = null)
    {
        $this->context->admin($request);
        $data = $request->validate(['order' => 'required|integer|min:0|max:2147483647']);

        return $this->data(DB::transaction(function () use ($courseId, $chapterId, $lessonId, $data) {
            $this->course($courseId);

            return $this->assign($lessonId ? $this->lesson($courseId, $chapterId, $lessonId) : $this->chapter($courseId, $chapterId), $data);
        }, 3));
    }

    public function destroy(Request $request, string $courseId, ?string $chapterId = null, ?string $lessonId = null)
    {
        $this->context->admin($request);
        DB::transaction(function () use ($courseId, $chapterId, $lessonId) {
            $course = $this->course($courseId);
            abort_if($course->enrollments()->exists(), 409, 'Program memiliki peserta. Nonaktifkan publikasi untuk menjaga riwayat.');
            ($lessonId ? $this->lesson($courseId, $chapterId, $lessonId) : ($chapterId ? $this->chapter($courseId, $chapterId) : $course))->delete();
        }, 3);

        return $this->data(true);
    }

    public function destroyAttachment(Request $request, string $courseId, string $chapterId, string $lessonId, string $id)
    {
        $this->context->admin($request);
        $this->lesson($courseId, $chapterId, $lessonId);
        Attachment::where('id', $id)->where('lesson_id', $lessonId)->firstOrFail()->delete();

        return $this->data(true);
    }

    public function quizzes(Request $request)
    {
        $this->context->admin($request);
        $query = Quiz::with('chapter.course:id,title,cohort_id', 'chapter.course.cohort:id,title', 'questions:id,quiz_id,type')->withCount(['questions', 'attempts'])->orderByDesc('created_at')->orderBy('id');
        if ($request->filled('search')) {
            $query->where('title', 'like', '%'.mb_substr($request->input('search'), 0, 100).'%');
        }

        if ($request->filled('cohort')) { $query->whereHas('chapter.course', fn ($c) => $c->where('cohort_id', $request->input('cohort'))); }
        if ($request->boolean('all')) {
            $items = $query->get()->map(fn ($row) => AcademyDto::make($row));
            return $this->data(['items' => $items, 'total' => $items->count(), 'page' => 1, 'pages' => 1]);
        }
        return $this->data(AcademyDto::page($query, (int) $request->input('page', 1)));
    }

    public function showQuiz(Request $request, string $courseId, string $chapterId, string $quizId)
    {
        $this->context->admin($request);

        return $this->data(AcademyDto::make($this->quiz($courseId, $chapterId, $quizId)->load(['chapter:id,title', 'questions' => fn ($q) => $q->orderBy('order')->orderBy('id'), 'questions.options'])->loadCount('attempts')));
    }

    public function ready($quiz): void
    {
        $quiz->load('questions.options');
        abort_if(! $quiz->questions->count() || $quiz->questions->contains(function ($q) {
            $count = $q->options->count();
            $correct = $q->options->where('isCorrect', true)->count();

            return $count < 2 || $count > 10 || ($q->type === 'MULTIPLE' ? $correct < 1 || $correct === $count : $correct !== 1) || ($q->type === 'TRUE_FALSE' && $count !== 2);
        }), 422, 'Periksa jenis soal, opsi dan kunci jawaban sebelum publikasi.');
    }

    public function quizInput(Request $request): array
    {
        $data = $request->validate(['title' => 'required|string|max:191', 'description' => 'nullable|string|max:30000', 'passingScore' => 'required|integer|min:0|max:100', 'timeLimitMinutes' => 'required|integer|min:1|max:1440', 'releaseDay' => 'sometimes|integer|min:1|max:30', 'kind' => 'sometimes|in:DAILY,WEEKLY,FINAL', 'quizDate' => 'nullable|date_format:Y-m-d\TH:i', 'closesAt' => 'nullable|date_format:Y-m-d\TH:i']);
        foreach (['quizDate', 'closesAt'] as $key) {
            $data[$key] = empty($data[$key]) ? null : CarbonImmutable::createFromFormat('!Y-m-d\TH:i', $data[$key], 'Asia/Jakarta')->utc();
        }
        abort_if($data['quizDate'] && $data['closesAt'] && $data['closesAt'] <= $data['quizDate'], 422, 'Batas evaluasi harus setelah waktu buka.');
        $data += ['releaseDay' => 1, 'kind' => 'DAILY'];
        $data['allowRetake'] = false;
        foreach (['isPublished', 'isActive'] as $key) {
            $data[$key] = $this->published($request, $key);
        }
        abort_if($data['isActive'] && ! $data['isPublished'], 422, 'Publikasikan ujian sebelum mengaktifkannya.');

        return $data;
    }

    public function saveQuiz(Request $request, string $courseId, string $chapterId, ?string $quizId = null)
    {
        $this->context->admin($request);

        return $this->persistQuiz($request, $courseId, $chapterId, $quizId);
    }

    public function persistQuiz(Request $request, string $courseId, string $chapterId, ?string $quizId)
    {
        $data = $this->quizInput($request);

        return $this->data(DB::transaction(function () use ($courseId, $chapterId, $quizId, $data) {
            $this->course($courseId);
            $this->chapter($courseId, $chapterId);
            $row = $quizId ? $this->quiz($courseId, $chapterId, $quizId) : new Quiz;
            if ($data['isPublished']) {
                abort_if(! $row->exists, 422, 'Simpan draft dan tambahkan soal sebelum publikasi.');
                $this->ready($row);
            }

            return $this->assign($row, $data + ['chapterId' => $chapterId]);
        }, 3));
    }

    public function saveQuestion(Request $request, string $courseId, string $chapterId, string $quizId, ?string $id = null)
    {
        $this->context->admin($request);

        return $this->persistQuestion($request, $courseId, $chapterId, $quizId, $id);
    }

    public function persistQuestion(Request $request, string $courseId, string $chapterId, string $quizId, ?string $id)
    {
        if (is_string($request->input('options'))) {
            $options = json_decode($request->input('options'), true);
            $request->merge(['options' => $options]);
        }
        $data = $request->validate(['question' => 'required|string|max:10000', 'order' => 'required|integer|min:0|max:2147483647', 'type' => 'sometimes|in:SINGLE,TRUE_FALSE,MULTIPLE', 'weight' => 'sometimes|integer|min:1|max:100', 'explanation' => 'nullable|string|max:10000', 'options' => 'required|array|min:2|max:10', 'options.*.id' => 'present|nullable|string|max:191', 'options.*.label' => 'required|string|max:4000', 'options.*.isCorrect' => 'required|boolean']);
        $data += ['type' => 'SINGLE', 'weight' => 1];
        $options = $data['options'];
        unset($data['options']);
        $correct = count(array_filter($options, fn ($o) => $o['isCorrect']));
        abort_unless($data['type'] === 'MULTIPLE' ? $correct > 0 && $correct < count($options) : $correct === 1, 422, 'Kunci jawaban tidak valid.');
        $labels = array_map(fn ($o) => mb_strtolower(trim($o['label'])), $options);
        $ids = array_filter(array_column($options, 'id'));
        abort_if(count(array_unique($labels)) !== count($labels) || count(array_unique($ids)) !== count($ids), 422, 'Opsi tidak boleh berulang.');
        abort_if($data['type'] === 'TRUE_FALSE' && (count($options) !== 2 || array_diff(['benar', 'salah'], $labels)), 422, 'Gunakan opsi Benar dan Salah.');

        return $this->data(DB::transaction(function () use ($courseId, $chapterId, $quizId, $id, $data, $options) {
            $this->course($courseId);
            $quiz = $this->quiz($courseId, $chapterId, $quizId);
            $quiz->updatedAt = now();
            $quiz->save();
            $row = $id ? Question::where('id', $id)->where('quiz_id', $quizId)->firstOrFail() : new Question;
            $owned = $row->exists ? $row->options()->pluck('id')->all() : [];
            abort_if(array_diff(array_filter(array_column($options, 'id')), $owned) !== [], 422, 'Opsi bukan milik pertanyaan ini.');
            $this->assign($row, $data + ['quizId' => $quizId]);
            $retained = array_filter(array_column($options, 'id'));
            $row->options()->whereNotIn('id', $retained)->delete();
            foreach ($options as $option) {
                $value = empty($option['id']) ? new Option : $row->options()->findOrFail($option['id']);
                $this->assign($value, ['questionId' => $row->id, 'label' => trim($option['label']), 'isCorrect' => $option['isCorrect']]);
            }
            if ($quiz->isPublished) {
                $this->ready($quiz);
            }

            return ['id' => $row->id];
        }, 3));
    }

    public function destroyQuestion(Request $request, string $courseId, string $chapterId, string $quizId, string $id)
    {
        $this->context->admin($request);
        DB::transaction(function () use ($courseId, $chapterId, $quizId, $id) {
            $this->course($courseId);
            $quiz = $this->quiz($courseId, $chapterId, $quizId);
            Question::where('id', $id)->where('quiz_id', $quizId)->firstOrFail()->delete();
            if ($quiz->isPublished) {
                $this->ready($quiz);
            }
        }, 3);

        return $this->data(true);
    }

    public function destroyQuiz(Request $request, string $courseId, string $chapterId, string $quizId)
    {
        $this->context->admin($request);
        DB::transaction(function () use ($courseId, $chapterId, $quizId) {
            $this->course($courseId);
            $quiz = $this->quiz($courseId, $chapterId, $quizId);
            abort_if($quiz->attempts()->exists(), 409, 'Ujian memiliki riwayat percobaan.');
            $quiz->delete();
        }, 3);

        return $this->data(true);
    }
}
