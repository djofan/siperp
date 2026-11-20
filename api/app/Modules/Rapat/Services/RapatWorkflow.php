<?php

namespace App\Modules\Rapat\Services;

use App\Modules\Rapat\Models\Meeting;
use Illuminate\Http\Request;

class RapatWorkflow
{
    public static function canWrite(Request $r, Meeting $m): bool
    {
        $role = $r->attributes->get('module_role');

        return in_array($role, ['admin', 'superadmin'], true) || ($role === 'secretary' && $m->created_by === $r->user()->id);
    }

    public static function authorizeWrite(Request $r): void
    {
        abort_unless(in_array($r->attributes->get('module_role'), ['admin', 'superadmin', 'secretary'], true), 403);
    }

    public static function assertEditable(Meeting $m, Request $r, bool $allowFinalized = false, bool $allowArchived = false): void
    {
        self::authorizeWrite($r);
        abort_unless(self::canWrite($r, $m), 404);
        $r->validate(['version' => 'required|integer|min:1']);
        abort_if($m->version !== (int) $r->input('version'), 409, 'Versi rapat sudah berubah.');
        abort_if($m->status === 'processing', 409, 'Rapat sedang diproses.');
        abort_if(! $allowArchived && $m->archived_at, 409, 'Rapat sudah diarsipkan.');
        abort_if(! $allowFinalized && ($m->payload['workflowStatus'] ?? 'draft') === 'finalized', 409, 'Notulen final dikunci. Buka kembali dengan alasan untuk mengubah isinya.');
    }
}
