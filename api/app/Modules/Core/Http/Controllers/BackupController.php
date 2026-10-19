<?php

namespace App\Modules\Core\Http\Controllers;

use App\Modules\Core\Models\AccessLog;
use App\Modules\Core\Services\BackupService;
use Illuminate\Http\Request;

class BackupController
{
    public function index(BackupService $backups)
    {
        return response()->json(['data' => $backups->list()]);
    }

    public function store(Request $request, BackupService $backups)
    {
        $result = $backups->create();
        $log = new AccessLog;
        $log->message = $request->user()->name.' membuat backup ERP '.$result['id'].'.';
        $log->save();

        return response()->json(['data' => $result], 201);
    }

    public function verify(Request $request, BackupService $backups)
    {
        $id = $request->validate(['id' => 'required|string|max:100'])['id'];
        abort_unless($backups->validId($id), 422);
        try {
            $result = $backups->verify($id);
        } catch (\RuntimeException $error) {
            abort(422, $error->getMessage());
        }

        return response()->json(['data' => $result]);
    }

    public function download(string $id, BackupService $backups)
    {
        abort_unless($backups->validId($id), 404);
        $path = $backups->path($id);
        abort_unless(is_file($path) && ! is_link($path), 404);

        return response()->download($path, $id, ['Content-Type' => 'application/octet-stream', 'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
    }
}
