<?php

namespace App\Modules\Academy\Http\Controllers;

use App\Modules\Academy\Models\ZakatAcademyCourse as Course;
use App\Modules\Academy\Models\ZakatAcademyEnrollment as Enrollment;
use App\Modules\Academy\Models\ZakatAcademyProfile as Profile;
use App\Modules\Academy\Models\ZakatAcademySetting as Setting;
use App\Modules\Academy\Services\AcademyContext;
use App\Modules\Core\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class IntakeController
{
    public function __construct(private AcademyContext $context) {}

    private function data($value = [])
    {
        return response()->json(['data' => ['error' => '', 'message' => 'Data berhasil disimpan.'] + $value]);
    }

    private function lockIntake(string $id)
    {
        $row = Course::where('id', $id)->lockForUpdate()->firstOrFail();
        abort_unless($row->isPublished && $row->registrationOpen && (! $row->startsAt || $row->startsAt->isFuture()), 409, 'Pendaftaran angkatan sudah ditutup.');
        abort_if($row->enrollments()->count() >= $row->quota, 409, 'Kuota program sudah penuh.');

        return $row;
    }

    private function phone(string $value): ?string
    {
        $value = preg_replace('/[\s()+.\-]/', '', $value);
        if (str_starts_with($value, '0')) {
            $value = '62'.substr($value, 1);
        }

return preg_match('/^62[1-9]\d{7,12}$/', $value) ? $value : null;
    }

    private function nip(): string
    {
        DB::table('participant_sequences')->insertOrIgnore(['module_slug' => 'academy', 'last_number' => 0]);
        $counter = DB::table('participant_sequences')->where('module_slug', 'academy')->lockForUpdate()->first();
        $number = $counter->last_number + 1;
        DB::table('participant_sequences')->where('module_slug', 'academy')->update(['last_number' => $number]);

        return 'PAZ'.str_pad((string) $number, 3, '0', STR_PAD_LEFT);
    }

    public function import(Request $request, string $courseId)
    {
        $this->context->admin($request);
        $csv = $request->validate(['csv' => 'required|string|max:100000'])['csv'];
        $stream = fopen('php://temp', 'w+');
        fwrite($stream, preg_replace('/^\xEF\xBB\xBF/', '', $csv));
        rewind($stream);
        $headers = fgetcsv($stream, null, ',', '"', '');
        abort_unless($headers && ! array_diff(['name', 'email', 'phone', 'gender'], array_map('strtolower', array_map('trim', $headers))), 422, 'Kolom CSV wajib: name,email,phone,gender.');
        $headers = array_map('strtolower', array_map('trim', $headers));
        $rows = [];
        while (($line = fgetcsv($stream, null, ',', '"', '')) !== false) {
            if (! array_filter($line, fn ($v) => trim((string) $v) !== '')) {
                continue;
            }
            $values = [];
            foreach (['name', 'email', 'phone', 'gender'] as $key) {
                $values[$key] = trim($line[array_search($key, $headers, true)] ?? '');
            }
            $values['email'] = strtolower($values['email']);
            $values['phone'] = $this->phone($values['phone']);
            $values['gender'] = strtoupper($values['gender']);
            abort_unless(mb_strlen($values['name']) >= 2 && mb_strlen($values['name']) <= 100 && filter_var($values['email'], FILTER_VALIDATE_EMAIL) && strlen($values['email']) <= 191 && $values['phone'] && in_array($values['gender'], ['IKHWAN', 'AKHWAT'], true), 422, 'Data CSV tidak valid.');
            $rows[] = $values;
            abort_if(count($rows) > 50, 422, 'Impor maksimal 50 peserta per batch.');
        } fclose($stream);
        abort_if(! count($rows) || count(array_unique(array_column($rows, 'email'))) !== count($rows) || count(array_unique(array_column($rows, 'phone'))) !== count($rows), 422, 'Email atau nomor WhatsApp dalam CSV berulang.');
        $credentials = DB::transaction(function () use ($rows, $courseId) {
            Course::where('id', $courseId)->lockForUpdate()->firstOrFail();
            $credentials = [];
            foreach ($rows as $data) {
                $user = User::where('email', $data['email'])->lockForUpdate()->first();
                abort_if($user && ! $user->is_active, 409, 'CSV memuat akun nonaktif.');
                $profile = $user ? Profile::where('user_id', $user->id)->lockForUpdate()->first() : null;
                abort_if($profile?->deletedAt || $profile && (($profile->phone && $profile->phone !== $data['phone']) || ($profile->gender && $profile->gender !== $data['gender'])), 409, 'Data peserta yang sudah ada tidak cocok.');
                if ($profile && Enrollment::where('profile_id', $profile->id)->where('course_id', $courseId)->exists()) {
                    continue;
                }
                $this->lockIntake($courseId);
                $newUser = ! $user;
                if (! $user) {
                    $password = 'Ia!'.Str::random(16);
                    $user = new User;
                    $user->name = $data['name'];
                    $user->email = $data['email'];
                    $user->password_hash = Hash::make($password);
                    $user->save();
                    $credentials[] = ['email' => $user->email, 'password' => $password];
                }
                $profile ??= new Profile;
                $profile->userId = $user->id;
                $profile->nis = $profile->nis ?: $this->nip();
                $profile->phone = $data['phone'];
                $profile->gender = $data['gender'];
                if ($newUser) {
                    $profile->mustChangePassword = true;
                } $profile->save();
                $enrollment = new Enrollment;
                $enrollment->profileId = $profile->id;
                $enrollment->courseId = $courseId;
                $enrollment->save();
            }

return $credentials;
        }, 3);

        return $this->data(['credentials' => $credentials]);
    }

    public function group(Request $request, string $id)
    {
        $this->context->admin($request);
        $data = $request->validate(['joined' => 'required|boolean']);
        $row = Enrollment::findOrFail($id);
        $row->groupJoinedAt = $data['joined'] ? now() : null;
        $row->save();

        return $this->data();
    }

    public function schedule(Request $request, string $courseId)
    {
        $this->context->admin($request);
        $data = $request->validate(['startsAt' => 'nullable|date_format:Y-m-d\TH:i']);
        $date = empty($data['startsAt']) ? null : CarbonImmutable::createFromFormat('!Y-m-d\TH:i', $data['startsAt'], 'Asia/Jakarta')->utc();
        DB::transaction(function () use ($courseId, $date) {
            $row = Course::where('id', $courseId)->lockForUpdate()->firstOrFail();
            abort_if($date && ! $row->isSimulation && $row->enrollments()->count() < $row->quota, 409, 'Tanggal mulai ditetapkan setelah kuota terpenuhi.');
            abort_if($row->startsAt && ! $row->startsAt->isFuture() && (! $date || ! $date->equalTo($row->startsAt)), 409, 'Tanggal program yang sudah dimulai tidak dapat digeser.');
            $row->startsAt = $date;
            $row->durationDays = 30;
            $row->teacher = 'Ustadz Irham';
            $row->quota = 200;
            $row->save();
        }, 3);

        return $this->data();
    }

    public function settings(Request $request)
    {
        $this->context->admin($request);
        $data = $request->validate(['csPhone' => 'required|string', 'daily_weight' => 'required|integer|min:0|max:100', 'weekly_weight' => 'required|integer|min:0|max:100', 'final_weight' => 'required|integer|min:0|max:100']);
        $phone = $this->phone($data['csPhone']);
        abort_unless($phone && $data['daily_weight'] + $data['weekly_weight'] + $data['final_weight'] === 100, 422, 'Nomor CS harus valid dan bobot harus berjumlah 100%.');
        DB::transaction(function () use ($data, $phone) {
            foreach (['daily_weight', 'weekly_weight', 'final_weight', 'cs_phone'] as $key) {
                $row = Setting::where('key', $key)->first() ?? new Setting;
                $row->key = $key;
                $row->value = $key === 'cs_phone' ? $phone : (string) $data[$key];
                $row->save();
            }
        });

        return $this->data();
    }

    public function registration(Request $request, string $courseId)
    {
        $this->context->admin($request);
        $data = $request->validate(['open' => 'required|boolean']);
        DB::transaction(function () use ($courseId, $data) {
            Course::where('is_simulation', false)->orderBy('id')->lockForUpdate()->get();
            $row = Course::where('id', $courseId)->where('is_simulation', false)->firstOrFail();
            abort_if($data['open'] && ($row->startsAt && ! $row->startsAt->isFuture() || $row->enrollments()->count() >= $row->quota), 409, 'Angkatan sudah dimulai atau kuota terpenuhi.');
            if ($data['open']) {
                Course::where('is_simulation', false)->update(['registration_open' => false]);
            } $row->registrationOpen = $data['open'];
            if ($data['open']) {
                $row->isPublished = true;
            } $row->save();
        }, 3);

        return $this->data();
    }

    public function cohort(Request $request)
    {
        $this->context->admin($request);
        $data = $request->validate(['title' => 'required|string|min:3|max:191', 'sourceId' => 'required|string']);
        $copied = [];
        try {
            DB::transaction(function () use ($data, &$copied) {
                $source = Course::where('id', $data['sourceId'])->where('is_simulation', false)->with('chapters.lessons.attachments', 'chapters.quizzes.questions.options')->lockForUpdate()->firstOrFail();
                $course = new Course;
                foreach (['shortDescription', 'description', 'teacher'] as $key) {
                    $course->$key = $source->$key;
                } $course->title = $data['title'];
                $course->slug = 'angkatan-'.Str::uuid();
                $course->quota = 200;
                $course->durationDays = 30;
                $course->isPublished = false;
                $course->registrationOpen = false;
                $course->order = $source->order + 1;
                $course->save();
                foreach ($source->chapters as $oldChapter) {
                    $chapter = $oldChapter->replicate(['id', 'created_at', 'updated_at']);
                    $chapter->unsetRelations();
                    $chapter->courseId = $course->id;
                    $chapter->save();
                    foreach ($oldChapter->lessons as $oldLesson) {
                        $lesson = $oldLesson->replicate(['id', 'created_at', 'updated_at']);
                        $lesson->unsetRelations();
                        $lesson->chapterId = $chapter->id;
                        $lesson->slug = 'materi-'.Str::uuid();
                        $lesson->save();
                        foreach ($oldLesson->attachments as $oldFile) {
                            $file = $oldFile->replicate(['id', 'created_at']);
                            $file->unsetRelations();
                            $file->id = (string) Str::uuid();
                            $file->lessonId = $lesson->id;
                            if ($oldFile->fileUrl === '/api/academy/files/'.$oldFile->id && isset(FileController::EXTENSIONS[$oldFile->fileType])) {
                                $ext = FileController::EXTENSIONS[$oldFile->fileType];
                                $sourcePath = 'academy/'.$oldFile->id.'.'.$ext;
                                $target = 'academy/'.$file->id.'.'.$ext;
                                abort_unless(Storage::disk('local')->exists($sourcePath) && Storage::disk('local')->copy($sourcePath, $target), 409, 'File template tidak tersedia.');
                                $copied[] = $target;
                                $file->fileUrl = '/api/academy/files/'.$file->id;
                                if ($lesson->videoUrl === $oldFile->fileUrl) {
                                    $lesson->videoUrl = $file->fileUrl;
                                    $lesson->save();
                                }
                            } $file->save();
                        }
                    }
                    foreach ($oldChapter->quizzes as $oldQuiz) {
                        $quiz = $oldQuiz->replicate(['id', 'created_at', 'updated_at']);
                        $quiz->unsetRelations();
                        $quiz->chapterId = $chapter->id;
                        $quiz->quizDate = null;
                        $quiz->closesAt = null;
                        $quiz->isPublished = false;
                        $quiz->isActive = false;
                        $quiz->save();
                        foreach ($oldQuiz->questions as $oldQuestion) {
                            $question = $oldQuestion->replicate(['id']);
                            $question->unsetRelations();
                            $question->quizId = $quiz->id;
                            $question->save();
                            foreach ($oldQuestion->options as $oldOption) {
                                $option = $oldOption->replicate(['id']);
                                $option->unsetRelations();
                                $option->questionId = $question->id;
                                $option->save();
                            }
                        }
                    }
                }
            });
        } catch (\Throwable $error) {
            foreach ($copied as $file) {
                Storage::disk('local')->delete($file);
            } throw $error;
        }

        return $this->data();
    }

    public function contacts(Request $request)
    {
        $this->context->admin($request);
        $courseId = $request->validate(['courseId' => 'required|string'])['courseId'];
        $rows = Enrollment::where('course_id', $courseId)->with('profile.user')->take(200)->get();
        $body = '';
        $escape = fn ($v) => str_replace(['\\', "\r", "\n", ',', ';'], ['\\\\', ' ', ' ', '\\,', '\\;'], $v);
        foreach ($rows as $row) {
            if ($row->profile->phone) {
                $body .= "BEGIN:VCARD\r\nVERSION:3.0\r\nFN:".$escape($row->profile->user->name)."\r\nTEL;TYPE=CELL:+".$row->profile->phone."\r\nEMAIL:".$escape($row->profile->user->email)."\r\nEND:VCARD\r\n";
            }
        }

        return response($body, 200, ['Content-Type' => 'text/vcard; charset=utf-8', 'Content-Disposition' => 'attachment; filename="insan-academy-contacts.vcf"', 'Cache-Control' => 'private, no-store']);
    }
}
