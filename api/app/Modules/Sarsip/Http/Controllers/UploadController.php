<?php

namespace App\Modules\Sarsip\Http\Controllers;

class UploadController extends \App\Modules\Sip\Http\Controllers\UploadController
{
    protected string $module = 'sarsip';

    protected bool $allowPdf = false;
}
