<?php

namespace App\Modules\Rapat\Services;

use App\Modules\Rapat\Models\Meeting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RapatHistory
{
    public const METADATA = ['title', 'meetingDate', 'startTime', 'endTime', 'location', 'agenda', 'chair', 'notetaker', 'template', 'participants', 'institution'];

    public static function snapshot(Meeting $m): array
    {
        $p = RapatData::normalize($m->payload);
        $metadata = array_replace(array_fill_keys(self::METADATA, null), array_intersect_key($p, array_flip(self::METADATA)));
        $metadata['meetingDate'] = $m->meeting_date->format('Y-m-d');
        $metadata['participants'] = $p['participants'] ?? [];
        $metadata['institution'] = $p['institution'] ?? RapatData::institution();

        return ['metadata' => $metadata, 'minutes' => $p['minutes'] ?? RapatData::minutes(), 'workflowStatus' => $p['workflowStatus'] ?? 'draft', 'finalizedAt' => $p['finalizedAt'] ?? null, 'transcript' => $p['transcript'] ?? '', 'segments' => $p['segments'] ?? [], 'archivedAt' => $m->archived_at?->toIso8601String()];
    }

    // Call only while holding the meeting lock, after incrementing and saving its version.
    public static function record(Meeting $m, ?Request $r, string $action, ?array $before, array $changedFields, ?string $reason = null): void
    {
        $actor = $r ? ['id' => $r->user()->id, 'name' => $r->user()->name] : ['id' => null, 'name' => 'AI lokal'];
        $payload = ['action' => $action, 'actor' => $actor, 'changedFields' => array_values($changedFields), 'reason' => $reason, 'before' => $before, 'after' => self::snapshot($m)];
        DB::table('rapat_revisions')->insert(['id' => (string) Str::uuid(), 'meeting_id' => $m->id, 'version' => $m->version, 'payload' => Crypt::encryptString(json_encode($payload, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE)), 'created_at' => now()]);
    }
}
