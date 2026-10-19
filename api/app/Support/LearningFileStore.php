<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class LearningFileStore
{
    public function detect(UploadedFile $file): array
    {
        $bytes = file_get_contents($file->getRealPath(), false, null, 0, 16);
        if (strlen($bytes) < 12) {
            abort(422, 'File tidak valid.');
        }
        if (str_starts_with($bytes, "\x89PNG\r\n\x1a\n")) {
            return ['mime' => 'image/png', 'ext' => 'png', 'kind' => 'image'];
        }
        if (str_starts_with($bytes, "\xff\xd8\xff")) {
            return ['mime' => 'image/jpeg', 'ext' => 'jpg', 'kind' => 'image'];
        }
        if (substr($bytes, 0, 4) === 'RIFF' && substr($bytes, 8, 4) === 'WEBP') {
            return ['mime' => 'image/webp', 'ext' => 'webp', 'kind' => 'image'];
        }
        if (str_starts_with($bytes, "\x1a\x45\xdf\xa3")) {
            return ['mime' => 'video/webm', 'ext' => 'webm', 'kind' => 'video'];
        }
        if (str_starts_with($bytes, 'OggS')) {
            return ['mime' => 'audio/ogg', 'ext' => 'ogg', 'kind' => 'audio'];
        }
        if (substr($bytes, 0, 4) === 'RIFF' && substr($bytes, 8, 4) === 'WAVE') {
            return ['mime' => 'audio/wav', 'ext' => 'wav', 'kind' => 'audio'];
        }
        if (str_starts_with($bytes, 'ID3') || (ord($bytes[0]) === 255 && (ord($bytes[1]) & 224) === 224)) {
            return ['mime' => 'audio/mpeg', 'ext' => 'mp3', 'kind' => 'audio'];
        }
        if (substr($bytes, 4, 4) === 'ftyp') {
            $brand = substr($bytes, 8, 4);

            return $brand === 'M4A ' ? ['mime' => 'audio/mp4', 'ext' => 'm4a', 'kind' => 'audio'] : ['mime' => $brand === 'qt  ' ? 'video/quicktime' : 'video/mp4', 'ext' => $brand === 'qt  ' ? 'mov' : 'mp4', 'kind' => 'video'];
        }
        abort(422, 'Format file tidak didukung.');
    }

    public function save(string $module, string $directory, UploadedFile $file, string $extension): string
    {
        $relative = $directory.'/'.Str::uuid().'.'.$extension;
        $file->storeAs($module.'/'.$directory, basename($relative), 'local');

        return $relative;
    }

    public function path(string $module, ?string $relative): ?string
    {
        if (! $relative || preg_match('~(^|[\\/])\.\.?([\\/]|$)|^[\\/]|:~', $relative)) {
            return null;
        }
        $root = realpath(Storage::disk('local')->path($module));
        $path = realpath(Storage::disk('local')->path($module.'/'.$relative));
        if (! $root || ! $path || ! is_file($path)) {
            return null;
        }
        $prefix = $root.DIRECTORY_SEPARATOR;
        $inside = DIRECTORY_SEPARATOR === '\\' ? str_starts_with(strtolower($path), strtolower($prefix)) : str_starts_with($path, $prefix);
        if (! $inside) {
            return null;
        }

        return $path;
    }

    public function delete(string $module, ?string $relative): void
    {
        if ($this->path($module, $relative)) {
            Storage::disk('local')->delete($module.'/'.$relative);
        }
    }
}
