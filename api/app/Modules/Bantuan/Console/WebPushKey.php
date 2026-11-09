<?php

namespace App\Modules\Bantuan\Console;

use Illuminate\Console\Command;
use Minishlink\WebPush\VAPID;

class WebPushKey extends Command
{
    protected $signature = 'bantuan:web-push-key';

    protected $description = 'Buat kunci VAPID privat satu kali tanpa menampilkan kuncinya';

    public function handle(): int
    {
        $path = config('bantuan-web-push.key_file');
        if (is_file($path)) {
            $this->info('Kunci Web Push sudah tersedia; tidak diubah.');

            return self::SUCCESS;
        }
        if (! is_dir(dirname($path))) {
            mkdir(dirname($path), 0700, true);
        }
        $keys = VAPID::createVapidKeys();
        $file = fopen($path, 'x');
        if (! $file) {
            $this->error('Tidak dapat membuat file kunci Web Push.');

            return self::FAILURE;
        }
        chmod($path, 0600);
        fwrite($file, json_encode($keys, JSON_THROW_ON_ERROR));
        fclose($file);
        $this->info('Kunci Web Push tersimpan privat. Simpan file ini di storage persisten dan backup privat.');

        return self::SUCCESS;
    }
}
