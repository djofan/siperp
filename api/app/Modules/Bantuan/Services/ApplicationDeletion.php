<?php

namespace App\Modules\Bantuan\Services;

use App\Modules\Bantuan\Models\Application;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ApplicationDeletion
{
    // Call only inside a transaction after locking and authorizing the applications.
    public function records(array $ids): array
    {
        $paths = DB::table('bantuan_documents')->whereIn('application_id', $ids)->get(['application_id', 'path'])
            ->filter(fn ($doc) => str_starts_with($doc->path, 'bantuan/'.$doc->application_id.'/') && ! str_contains($doc->path, '..'))
            ->pluck('path')->all();
        foreach (['bantuan_documents', 'bantuan_notifications', 'bantuan_events'] as $table) {
            DB::table($table)->whereIn('application_id', $ids)->delete();
        }
        Application::whereIn('id', $ids)->delete();

        return $paths;
    }

    public function files(array $paths): void
    {
        if ($paths) Storage::disk('local')->delete($paths);
    }
}
