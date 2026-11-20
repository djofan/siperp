<?php

namespace App\Modules\Rapat\Services;

use App\Modules\Rapat\Models\Meeting;
use Illuminate\Http\Request;

class AttachmentAccess
{
    public function meeting(Request $request, string $id, bool $lock = false): Meeting
    {
        $role = $request->attributes->get('module_role');
        abort_unless($request->user() && in_array($role, ['admin', 'superadmin', 'secretary', 'viewer'], true), 403);

        return Meeting::query()
            ->when($role === 'secretary', fn ($q) => $q->where('created_by', $request->user()->id))
            ->when($lock, fn ($q) => $q->lockForUpdate())
            ->findOrFail($id);
    }

    public function writable(Request $request): void
    {
        RapatWorkflow::authorizeWrite($request);
    }

    public function editable(Request $request, Meeting $meeting): void
    {
        RapatWorkflow::assertEditable($meeting, $request);
    }
}
