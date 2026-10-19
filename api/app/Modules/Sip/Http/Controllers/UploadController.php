<?php

namespace App\Modules\Sip\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadController
{
    protected string $module = 'sip';

    protected bool $allowPdf = true;

    public function store(Request $request): JsonResponse
    {
        $types = 'image/jpeg,image/png,image/webp'.($this->allowPdf ? ',application/pdf' : '');
        $request->validate(['file' => 'required|file|max:2048|mimetypes:'.$types]);
        $file = $request->file('file');
        $extension = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp', 'application/pdf' => 'pdf'][$file->getMimeType()];
        $filename = Str::uuid().'.'.$extension;
        $file->storeAs('uploads/'.$this->module, $filename, 'public');

        return response()->json(['url' => '/uploads/'.$this->module.'/'.$filename], 201);
    }

    public function show(string $filename)
    {
        abort_unless(preg_match('/^[a-f0-9-]{36}\.(jpg|png|webp|pdf)$/D', $filename), 404);
        $path = Storage::disk('public')->path('uploads/'.$this->module.'/'.$filename);
        abort_unless(is_file($path), 404);

        return response()->file($path, ['X-Content-Type-Options' => 'nosniff']);
    }
}
