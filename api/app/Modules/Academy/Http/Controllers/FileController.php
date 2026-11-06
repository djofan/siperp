<?php

namespace App\Modules\Academy\Http\Controllers;

use App\Modules\Academy\Models\ZakatAcademyLesson as Lesson;
use App\Modules\Academy\Models\ZakatAcademyLessonAttachment as Attachment;
use App\Modules\Academy\Models\ZakatAcademyLessonProgress as Progress;
use App\Modules\Academy\Services\AcademyContext;
use App\Modules\Core\Auth\SessionData;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class FileController
{
    public const EXTENSIONS = ['audio/mpeg' => 'mp3', 'audio/wav' => 'wav', 'audio/ogg' => 'ogg', 'audio/mp4' => 'm4a', 'application/pdf' => 'pdf'];

    public function __construct(private AcademyContext $context) {}

    private function access(Request $request, string $id, bool $teacher = false)
    {
        $this->context->available($request);
        $session = app(SessionData::class)->forUser($request->user());
        $isTeacher = $request->user()->is_superadmin || in_array($session['moduleRoles']['academy'] ?? null, ['admin', 'teacher'], true);
        if ($isTeacher) {
            return Lesson::findOrFail($id);
        }
        abort_if($teacher, 403);
        $profile = $this->context->profile($request);

        return $this->context->lesson($id, $profile->id);
    }

    private function detect(string $bytes): ?string
    {
        if (str_starts_with($bytes, '%PDF-')) {
            return 'application/pdf';
        }
        if (substr($bytes, 0, 4) === 'RIFF' && substr($bytes, 8, 4) === 'WAVE') {
            return 'audio/wav';
        }
        if (substr($bytes, 0, 4) === 'OggS') {
            return 'audio/ogg';
        }
        if (substr($bytes, 4, 4) === 'ftyp' && in_array(substr($bytes, 8, 4), ['M4A ', 'M4B '], true)) {
            return 'audio/mp4';
        }
        if (str_starts_with($bytes, 'ID3') || strlen($bytes) > 1 && ord($bytes[0]) === 255 && (ord($bytes[1]) & 224) === 224) {
            return 'audio/mpeg';
        }

        return null;
    }

    public function upload(Request $request)
    {
        $data = $request->validate(['lessonId' => 'required|string', 'file' => 'required|file|max:51200']);
        $this->access($request, $data['lessonId'], true);
        $result = $this->storeFile(Lesson::findOrFail($data['lessonId']), $request->file('file'), $request->boolean('audioOnly'));
        unset($result['storagePath']);
        return response()->json($result);
    }

    public function storeFile(Lesson $lesson, UploadedFile $file, bool $audioOnly = false): array
    {
        $data = ['lessonId' => $lesson->id];
        abort_if($file->getSize() > 50 * 1024 * 1024, 422, 'Ukuran audio maksimal 50 MB.');
        $handle = fopen($file->getRealPath(), 'rb');
        $bytes = fread($handle, 32);
        fclose($handle);
        $mime = $this->detect($bytes);
        abort_if($audioOnly && ! str_starts_with($mime ?? '', 'audio/'), 422, 'Gunakan file audio MP3, WAV, OGG, atau M4A.');
        abort_if(! $mime || $mime === 'application/pdf' && $file->getSize() > 10 * 1024 * 1024, 422, 'Gunakan MP3, WAV, OGG, M4A maksimal 50 MB atau PDF maksimal 10 MB.');
        $id = (string) Str::uuid();
        $url = '/api/academy/files/'.$id;
        $path = 'academy/'.$id.'.'.self::EXTENSIONS[$mime];
        $stream = fopen($file->getRealPath(), 'rb');
        try {
            $stored = Storage::disk('local')->put($path, $stream);
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }
        abort_unless($stored, 500, 'File gagal disimpan.');
        try {
            DB::transaction(function () use ($data, $file, $id, $url, $mime) {
                $row = new Attachment;
                $row->id = $id;
                $row->lessonId = $data['lessonId'];
                $row->title = mb_substr(basename(str_replace('\\', '/', $file->getClientOriginalName())), 0, 191);
                $row->fileUrl = $url;
                $row->fileType = $mime;
                $row->fileSize = $file->getSize();
                $row->save();
                if (str_starts_with($mime, 'audio/')) {
                    $lesson = Lesson::findOrFail($data['lessonId']);
                    $lesson->videoProvider = 'AUDIO';
                    $lesson->videoUrl = $url;
                    $lesson->save();
                }
            });
        } catch (\Throwable $error) {
            Storage::disk('local')->delete($path);
            throw $error;
        }

        return ['fileUrl' => $url, 'storagePath' => $path, 'isAudio' => str_starts_with($mime, 'audio/'), 'message' => 'File berhasil disimpan.'];
    }

    public function show(Request $request, string $fileId)
    {
        abort_unless(preg_match('/^[a-zA-Z0-9-]{1,100}$/', $fileId), 404);
        $file = Attachment::findOrFail($fileId);
        abort_unless(isset(self::EXTENSIONS[$file->fileType]), 404);
        $this->access($request, $file->lessonId);
        $path = $file->storagePath ?: 'academy/'.$file->id.'.'.self::EXTENSIONS[$file->fileType];
        abort_unless(Storage::disk('local')->exists($path), 404);

        // BinaryFileResponse implements Range/206/416 and streams without loading the file.
        return response()->file(Storage::disk('local')->path($path), ['Content-Type' => $file->fileType, 'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff'])->setContentDisposition($file->fileType === 'application/pdf' ? 'attachment' : 'inline', $file->title, 'material.'.self::EXTENSIONS[$file->fileType]);
    }

    public function audioProgress(Request $request)
    {
        $data = $request->validate(['lessonId' => 'required|string', 'position' => 'required|numeric|min:0|max:86400', 'source' => 'required|string|max:2048']);
        $profile = $this->context->profile($request);
        $session = app(SessionData::class)->forUser($request->user());
        abort_if($request->user()->is_superadmin || in_array($session['moduleRoles']['academy'] ?? null, ['admin', 'teacher'], true), 403);
        $lesson = $this->context->lesson($data['lessonId'], $profile->id);
        abort_unless($lesson->videoUrl === $data['source'], 403);
        DB::transaction(function () use ($profile, $lesson, $data) {
            $profile->newQuery()->where('id', $profile->id)->lockForUpdate()->firstOrFail();
            $row = Progress::where('profile_id', $profile->id)->where('lesson_id', $lesson->id)->first() ?? new Progress;
            $row->profileId = $profile->id;
            $row->lessonId = $lesson->id;
            $row->audioPosition = $data['position'];
            $row->audioSource = $lesson->videoUrl;
            $row->save();
        });

        return response()->json(['ok' => true]);
    }
}
