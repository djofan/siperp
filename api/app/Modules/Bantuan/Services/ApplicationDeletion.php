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
        $groups = DB::table('bantuan_funding_request_items')->whereIn('application_id', $ids)->pluck('funding_request_id')->unique()->sort()->values();
        foreach ($groups as $group) {
            DB::table('bantuan_funding_requests')->where('id', $group)->lockForUpdate()->first();
        }
        DB::table('bantuan_funding_request_items')->whereIn('application_id', $ids)->delete();
        foreach ($groups as $group) {
            $remaining = DB::table('bantuan_funding_request_items')->where('funding_request_id', $group);
            if (! $remaining->exists()) {
                DB::table('bantuan_funding_requests')->where('id', $group)->delete();
            } else {
                DB::table('bantuan_funding_requests')->where('id', $group)->update([
                    'total_amount' => $remaining->sum('amount'), 'version' => DB::raw('version + 1'), 'updated_at' => now(),
                ]);
            }
        }
        foreach (['bantuan_whatsapp_outbox', 'bantuan_documents', 'bantuan_notifications', 'bantuan_events'] as $table) {
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
