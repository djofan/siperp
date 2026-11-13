<?php

namespace App\Modules\Academy\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class QuestionMedia
{
    public const TYPES = [
        'image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp',
        'audio/mpeg' => 'mp3', 'audio/wav' => 'wav', 'audio/ogg' => 'ogg',
        'audio/mp4' => 'm4a', 'audio/webm' => 'webm',
    ];

    public function store(UploadedFile $file): array
    {
        $mime = (string) $file->getMimeType();
        abort_unless(isset(self::TYPES[$mime]), 422, 'Gunakan gambar JPG, PNG, WebP atau audio MP3, WAV, OGG, M4A, WebM.');
        $limit = str_starts_with($mime, 'image/') ? 5 : 15;
        abort_if($file->getSize() > $limit * 1024 * 1024, 422, "Ukuran media maksimal {$limit} MB.");
        if (str_starts_with($mime, 'image/')) {
            abort_unless(@getimagesize($file->getRealPath()), 422, 'Isi file gambar tidak valid.');
        }

        $path = 'academy/questions/'.Str::uuid().'.'.self::TYPES[$mime];
        $stream = fopen($file->getRealPath(), 'rb');
        try {
            $stored = Storage::disk('local')->put($path, $stream);
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
        }
        abort_unless($stored, 500, 'Media soal gagal disimpan.');

        return ['mediaPath' => $path, 'mediaMime' => $mime,
            'mediaName' => mb_substr(basename(str_replace('\\', '/', $file->getClientOriginalName())), 0, 191)];
    }

    public function delete(?string $path): void
    {
        if ($path && str_starts_with($path, 'academy/questions/')) {
            Storage::disk('local')->delete($path);
        }
    }
}
