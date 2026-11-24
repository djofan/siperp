<?php

namespace App\Modules\Rapat\Services;

use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Support\Facades\Storage;
use League\Flysystem\Local\LocalFilesystemAdapter;
use RuntimeException;

class RapatStorage
{
    public static function disk(): FilesystemAdapter
    {
        $local = Storage::disk('local');
        if (! $local->getAdapter() instanceof LocalFilesystemAdapter) {
            throw new RuntimeException('Rapat requires private local storage.');
        }

        // Same persistent root/path as existing encrypted uploads. These permission
        // settings affect only writes made through Rapat, never another module.
        return Storage::build([
            'driver' => 'local', 'root' => $local->path(''), 'serve' => false,
            'visibility' => 'private', 'directory_visibility' => 'private',
            'permissions' => ['file' => ['private' => 0640], 'dir' => ['private' => 02770]],
            'throw' => true,
        ]);
    }

    public static function put(string $path, string $encrypted): bool
    {
        if (! preg_match('~^rapat/(media|attachments)/[a-f0-9-]{36}\.enc$~D', $path)) {
            throw new RuntimeException('Invalid private Rapat upload path.');
        }
        $disk = self::disk();
        // Also handles a parent created earlier by the old owner-only adapter.
        foreach (['rapat', dirname($path)] as $dir) {
            if (is_link($disk->path($dir))) {
                throw new RuntimeException('Linked private Rapat directory is not allowed.');
            }
            $disk->makeDirectory($dir);
            clearstatcache(true, $disk->path($dir));
            if (PHP_OS_FAMILY === 'Windows' || (fileperms($disk->path($dir)) & 07777) !== 02770) {
                $disk->setVisibility($dir, 'private');
            }
        }

        return $disk->put($path, $encrypted, ['visibility' => 'private']);
    }
}
