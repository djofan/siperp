<?php

namespace App\Modules\Lazsip\Http\Controllers;

class UploadController extends \App\Support\Http\ModuleUploadController
{
    protected string $module = 'lazsip';

    protected bool $allowPdf = false;
}
