<?php

namespace App\Modules\Bantuan\Services;

class WebPushKeys
{
    public function read(): ?array
    {
        $file = config('bantuan-web-push.key_file');
        if (! is_string($file) || ! is_readable($file)) {
            return null;
        }
        $keys = json_decode(file_get_contents($file), true, flags: JSON_THROW_ON_ERROR);

        return isset($keys['publicKey'], $keys['privateKey']) ? $keys : null;
    }
}
