<?php

namespace App\Modules\Lazsip\Http\Controllers;

class UploadController extends \App\Modules\Sip\Http\Controllers\UploadController
{
    protected string $module = 'lazsip';

    protected bool $allowPdf = false;
}
