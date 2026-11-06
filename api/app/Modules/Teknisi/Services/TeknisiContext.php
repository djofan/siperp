<?php

namespace App\Modules\Teknisi\Services;

use App\Modules\Core\Auth\SessionData;
use App\Modules\Teknisi\Models\TeknisiTechnician;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TeknisiContext
{
    public const CLOSED = ['collected', 'cancelled'];

    public const TRANSITIONS = [
        'received' => ['diagnosis', 'cancelled'], 'diagnosis' => ['approval', 'repairing', 'waiting_parts', 'cancelled'],
        'approval' => ['repairing', 'waiting_parts', 'cancelled'], 'repairing' => ['waiting_parts', 'ready', 'cancelled'],
        'waiting_parts' => ['diagnosis', 'repairing', 'cancelled'], 'ready' => ['repairing', 'collected'], 'collected' => [], 'cancelled' => [],
    ];

    public function actor(Request $request, bool $write = false, bool $manager = false): array
    {
        $user = $request->user();
        abort_unless($user?->is_active && DB::table('modules')->where('slug', 'teknisi')->where('is_active', true)->exists(), 403);
        $session = app(SessionData::class)->forUser($user);
        $role = $user->is_superadmin ? 'admin' : ($session['moduleRoles']['teknisi'] ?? null);
        abort_unless(in_array($role, ['admin', 'manager', 'technician', 'monitoring'], true), 403);
        abort_if($write && $role === 'monitoring', 403, 'Akun monitoring hanya dapat melihat data.');
        abort_if($manager && ! in_array($role, ['admin', 'manager'], true), 403);
        $tech = $role === 'technician' ? TeknisiTechnician::where('userId', $user->id)->where('isActive', true)->first() : null;
        abort_if($role === 'technician' && ! $tech, 403);

        return ['user' => $user, 'role' => $role, 'tech' => $tech, 'manager' => in_array($role, ['admin', 'manager'], true)];
    }

    public function scope($query, array $actor, string $column = 'outletId')
    {
        return $actor['tech'] ? $query->where($column, $actor['tech']->outletId) : $query;
    }
}
