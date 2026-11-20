<?php

namespace App\Modules\Rapat\Services;

use RuntimeException;

class NoSpeechDetected extends RuntimeException
{
    public const MESSAGE = 'Tidak ada ucapan yang terdeteksi pada rekaman. Periksa suara dan mikrofon, unggah rekaman yang lebih jelas, atau isi transkrip secara manual.';

    public function __construct()
    {
        parent::__construct(self::MESSAGE);
    }
}
