<?php

namespace App\Modules\Teknisi\Services;

use App\Contracts\Modules\ModuleSession;
use App\Modules\Teknisi\Models\TeknisiTechnician;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TeknisiSession implements ModuleSession
{
    public function credentialField(): string { return 'nip'; }
    public function resolveLogin(string $identifier): array
    {
        $membership = DB::table('teknisi_participants')->where('nip', strtoupper($identifier))->whereNull('deleted_at')->first();
        return ['userId' => $membership?->userId, 'membership' => $membership];
    }
    public function viewer(Request $request, array $session): array
    {
        $user = $request->user(); $role = $user->is_superadmin ? 'admin' : ($session['moduleRoles']['teknisi'] ?? null);
        abort_unless($this->available() && in_array($role, ['admin', 'manager', 'technician', 'monitoring'], true), 403);
        $technician = $role === 'technician' ? TeknisiTechnician::where('userId', $user->id)->first() : null;
        abort_if($role === 'technician' && ! $technician?->isActive, 403);
        return ['id' => $user->id, 'name' => $user->name, 'role' => $role, 'technician' => $technician, 'canManage' => in_array($role, ['admin', 'manager'], true), 'canWrite' => $role !== 'monitoring'];
    }
    public function available(): bool { return DB::table('modules')->where('slug', 'teknisi')->where('is_active', true)->exists(); }
    public function redirect(array $session, ?object $membership): string { return in_array('teknisi', $session['moduleSlugs'], true) ? '/teknisi/panel' : '/teknisi/peserta'; }
    public function preferredPanel(array $access): ?string
    {
        return $access && collect($access)->every(fn ($row) => $row->slug === 'teknisi' && $row->role === 'technician') ? '/teknisi/panel' : null;
    }
}
