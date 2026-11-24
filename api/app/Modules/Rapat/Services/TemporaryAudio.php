<?php

namespace App\Modules\Rapat\Services;

use RuntimeException;

class TemporaryAudio
{
    public static function root(): string
    {
        $owner = function_exists('posix_geteuid') ? (string) posix_geteuid() : substr(hash('sha256', sys_get_temp_dir()), 0, 16);

        return rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR).DIRECTORY_SEPARATOR.'siperp-rapat-'.$owner;
    }

    public function withFile(string $bytes, callable $use): mixed
    {
        $dir = self::root();
        if (is_link($dir)) {
            throw new RuntimeException('Rapat temporary directory is unsafe.');
        }
        if (! is_dir($dir) && ! mkdir($dir, 0700) && ! is_dir($dir)) {
            throw new RuntimeException('Rapat temporary directory is unavailable.');
        }
        if (PHP_OS_FAMILY !== 'Windows') {
            $stat = lstat($dir);
            if ($stat === false || (function_exists('posix_geteuid') && $stat['uid'] !== posix_geteuid()) || ($stat['mode'] & 0077) !== 0) {
                throw new RuntimeException('Rapat temporary directory is not private.');
            }
        }
        if (! is_writable($dir)) {
            throw new RuntimeException('Rapat temporary directory is not writable.');
        }
        // Exclusive creation prevents tempnam's silent fallback to a different directory.
        $path = $dir.DIRECTORY_SEPARATOR.'audio-'.bin2hex(random_bytes(16));
        $stream = null;
        try {
            $stream = fopen($path, 'x+b');
            if ($stream === false || ! chmod($path, 0600)) {
                throw new RuntimeException('Rapat temporary audio cannot be created.');
            }
            $written = 0;
            while ($written < strlen($bytes)) {
                $size = fwrite($stream, substr($bytes, $written));
                if ($size === false || $size === 0) {
                    throw new RuntimeException('Rapat temporary audio write failed.');
                }
                $written += $size;
            }
            if (! fflush($stream)) {
                throw new RuntimeException('Rapat temporary audio write failed.');
            }
            fclose($stream);
            $stream = null;

            return $use($path);
        } finally {
            if (is_resource($stream)) {
                fclose($stream);
            }
            if (is_file($path)) {
                unlink($path);
            }
        }
    }
}
