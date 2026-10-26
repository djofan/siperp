<?php

namespace App\Modules\Bantuan\Services;

use App\Modules\Bantuan\Models\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class Access
{
    public const ROLES = ['admin', 'call_center', 'approver', 'verifier', 'volunteer', 'fund_requester', 'treasurer', 'chair'];

    public function role(Request $request): string
    {
        $role = $request->user()->is_superadmin ? 'admin' : (string) $request->attributes->get('module_role');
        abort_unless(in_array($role, self::ROLES, true), 403, 'Peran modul tidak valid. Hubungi superadmin.');

        return $role;
    }

    public function allow(Request $request, array $roles): void
    {
        abort_unless(in_array($this->role($request), ['admin', ...$roles], true), 403, 'Peran Anda tidak diizinkan melakukan tindakan ini.');
    }

    public function scope($query, Request $request)
    {
        $role = $this->role($request);
        if ($role === 'verifier') {
            $query->where(fn ($q) => $q->where('created_by', $request->user()->id)->orWhere('verifier_id', $request->user()->id)->orWhere('distributor_id', $request->user()->id));
        }
        if ($role === 'volunteer') {
            // Relawan santunan tidak mendapat akses ke data pengajuan bantuan.
            $query->whereRaw('1 = 0');
        }
        if (in_array($role, ['fund_requester', 'treasurer'], true)) {
            $query->whereNotNull('amount');
        }

        return $query;
    }

    public function find(Request $request, string $id, bool $lock = false): Application
    {
        $q = $this->scope(Application::query(), $request);

        return ($lock ? $q->lockForUpdate() : $q)->findOrFail($id);
    }

    public function sensitive(Request $request): bool
    {
        return ! in_array($this->role($request), ['fund_requester', 'treasurer'], true);
    }

    public function assigned(string $userId, string $role): bool
    {
        return DB::table('module_access')->join('modules', 'modules.id', '=', 'module_access.module_id')
            ->join('users', 'users.id', '=', 'module_access.user_id')->where('modules.slug', 'bantuan')
            ->where('module_access.user_id', $userId)->where('module_access.role', $role)->where('users.is_active', true)->exists();
    }

    public function bypass(Request $request): bool
    {
        return $this->role($request) === 'admin' || (in_array($this->role($request), ['call_center', 'verifier'], true)
            && (bool) DB::table('bantuan_staff')->where('user_id', $request->user()->id)->value('can_bypass'));
    }
}
