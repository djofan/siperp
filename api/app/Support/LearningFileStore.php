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
            $types = $this->webmTrackTypes($file);
            abort_unless(in_array(1, $types, true) || in_array(2, $types, true), 422, 'File media tidak valid.');
            $kind = in_array(1, $types, true) ? 'video' : 'audio';

            return ['mime' => $kind.'/webm', 'ext' => 'webm', 'kind' => $kind];
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
            $handlers = $this->mp4Handlers($file);
            abort_unless(in_array('soun', $handlers, true) || in_array('vide', $handlers, true), 422, 'File media tidak valid.');
            if (! in_array('vide', $handlers, true)) {
                return ['mime' => 'audio/mp4', 'ext' => 'm4a', 'kind' => 'audio'];
            }

            return ['mime' => $brand === 'qt  ' ? 'video/quicktime' : 'video/mp4', 'ext' => $brand === 'qt  ' ? 'mov' : 'mp4', 'kind' => 'video'];
        }
        abort(422, 'Format file tidak didukung.');
    }

    private function webmTrackTypes(UploadedFile $file): array
    {
        // EBML VINT sizes (RFC 8794); inspect Tracks/TrackEntry/TrackType,
        // skipping payloads rather than reading a whole 50 MB recording.
        $stream = fopen($file->getRealPath(), 'rb');
        abort_unless($stream, 422, 'File tidak dapat dibaca.');
        $types = [];
        $docType = null;
        $remaining = 10000;
        $vint = function (int $end, bool $id = false) use ($stream): array {
            abort_if(ftell($stream) >= $end, 422, 'File media tidak valid.');
            $first = ord(fread($stream, 1));
            $mask = 0x80;
            $length = 1;
            while ($mask && ! ($first & $mask)) {
                $mask >>= 1;
                $length++;
            }
            abort_if(! $mask || $length > ($id ? 4 : 8) || ftell($stream) + $length - 1 > $end, 422, 'File media tidak valid.');
            $value = $id ? $first : ($first & ($mask - 1));
            $unknown = ! $id && $value === $mask - 1;
            for ($index = 1; $index < $length; $index++) {
                $byte = ord(fread($stream, 1));
                $value = ($value << 8) | $byte;
                $unknown = $unknown && $byte === 0xFF;
            }

            return [$value, $unknown];
        };
        $walk = function (int $start, int $end, string $parent = '') use (&$walk, $stream, $vint, &$types, &$docType, &$remaining): void {
            for ($offset = $start; $offset < $end;) {
                abort_if(--$remaining < 0, 422, 'File media tidak valid.');
                fseek($stream, $offset);
                [$id] = $vint($end, true);
                [$size, $unknown] = $vint($end);
                $body = ftell($stream);
                // MediaRecorder leaves the Segment size unknown while streaming.
                abort_if($unknown && ($id !== 0x18538067 || $parent !== ''), 422, 'File media tidak valid.');
                $size = $unknown ? $end - $body : $size;
                abort_if($size > $end - $body, 422, 'File media tidak valid.');
                $next = $body + $size;
                if (($parent === '' && $id === 0x1A45DFA3) || ($parent === '' && $id === 0x18538067)
                    || ($parent === 'segment' && $id === 0x1654AE6B) || ($parent === 'tracks' && $id === 0xAE)) {
                    $child = match ($id) {
                        0x1A45DFA3 => 'header', 0x18538067 => 'segment', 0x1654AE6B => 'tracks', default => 'entry',
                    };
                    $walk($body, $next, $child);
                    if ($child === 'tracks') {
                        return;
                    }
                } elseif ($parent === 'header' && $id === 0x4282 && $size > 0 && $size <= 16) {
                    $docType = fread($stream, $size);
                } elseif ($parent === 'entry' && $id === 0x83 && $size > 0 && $size <= 8) {
                    $type = 0;
                    for ($index = 0; $index < $size; $index++) {
                        $type = ($type << 8) | ord(fread($stream, 1));
                    }
                    $types[] = $type;
                } elseif ($parent === 'segment' && $id === 0x1F43B675) {
                    // Tracks must precede media clusters; no need to scan media bytes.
                    return;
                }
                $offset = $next;
            }
        };
        try {
            $walk(0, $file->getSize());
        } finally {
            fclose($stream);
        }

        return $docType === 'webm' ? $types : [];
    }

    private function mp4Handlers(UploadedFile $file): array
    {
        // Inspect track handlers, not the container brand: Safari audio can use an isom/mp42 brand.
        // Seek past media payloads so a 50 MB upload is never loaded into memory.
        $stream = fopen($file->getRealPath(), 'rb');
        if (! $stream) {
            abort(422, 'File tidak dapat dibaca.');
        }
        $handlers = [];
        $remaining = 10000;
        $walk = function (int $start, int $end, int $depth = 0) use (&$walk, $stream, &$handlers, &$remaining): void {
            for ($offset = $start; $offset + 8 <= $end && --$remaining >= 0; $offset += $size) {
                fseek($stream, $offset);
                $header = fread($stream, 8);
                if (strlen($header) !== 8) {
                    return;
                }
                $size = unpack('N', substr($header, 0, 4))[1];
                $type = substr($header, 4, 4);
                $headerSize = 8;
                if ($size === 1) {
                    $extended = fread($stream, 8);
                    if (strlen($extended) !== 8) {
                        return;
                    }
                    $parts = unpack('Nhigh/Nlow', $extended);
                    if ($parts['high'] !== 0) {
                        return;
                    }
                    $size = $parts['low'];
                    $headerSize = 16;
                } elseif ($size === 0) {
                    $size = $end - $offset;
                }
                if ($size < $headerSize || $size > $end - $offset) {
                    return;
                }
                if ($type === 'hdlr' && $depth === 3 && $size >= $headerSize + 12) {
                    fseek($stream, $offset + $headerSize + 8);
                    $handlers[] = fread($stream, 4);
                } elseif (($depth === 0 && $type === 'moov') || ($depth === 1 && $type === 'trak') || ($depth === 2 && $type === 'mdia')) {
                    $walk($offset + $headerSize, $offset + $size, $depth + 1);
                }
            }
        };
        try {
            $walk(0, $file->getSize());
        } finally {
            fclose($stream);
        }

        return $handlers;
    }

    public function save(string $module, string $directory, UploadedFile $file, string $extension): string
    {
        $relative = $directory.'/'.Str::uuid().'.'.$extension;
        if ($file->storeAs($module.'/'.$directory, basename($relative), 'local') === false) {
            throw new \RuntimeException('Unable to store private learning file.');
        }

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
