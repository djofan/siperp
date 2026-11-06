<?php

namespace App\Modules\Sarsip\Http\Controllers;

class UploadController extends \App\Support\Http\ModuleUploadController
{
    protected string $module = 'sarsip';

    protected bool $allowPdf = false;
}
