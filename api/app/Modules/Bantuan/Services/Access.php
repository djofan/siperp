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
        if ($request->attributes->has('bantuan_active_role')) return $request->attributes->get('bantuan_active_role');
        $roles = $this->roles($request);
        $active = DB::table('bantuan_active_roles')->where('session_key', $this->sessionKey($request))->where('user_id', $request->user()->id)->value('role');
        $role = in_array($active, $roles, true) ? $active : $roles[0];
        $request->attributes->set('bantuan_active_role', $role);

        return $role;
    }

    public static function expandRoles(string $primary, ?string $stored): array
    {
        $roles = $stored ? json_decode($stored, true) : null;
        // A Core role replacement invalidates older module-specific grants.
        if (! is_array($roles) || ($roles[0] ?? null) !== $primary) $roles = [$primary];
        return array_values(array_intersect(array_unique($roles), self::ROLES));
    }

    public function roles(Request $request): array
    {
        if ($request->user()->is_superadmin) return ['admin'];
        $primary = (string) $request->attributes->get('module_role');
        $roles = self::expandRoles($primary, DB::table('bantuan_staff')->where('user_id', $request->user()->id)->value('roles'));
        abort_unless($roles, 403, 'Peran modul tidak valid. Hubungi superadmin.');
        return $roles;
    }

    public function sessionKey(Request $request): string
    {
        $id = $request->user()->currentAccessToken()?->id ?? null;
        return $id ? 'token:'.$id : 'user:'.$request->user()->id;
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
        $member = DB::table('module_access')->join('modules', 'modules.id', '=', 'module_access.module_id')
            ->leftJoin('bantuan_staff', 'bantuan_staff.user_id', '=', 'module_access.user_id')
            ->join('users', 'users.id', '=', 'module_access.user_id')->where('modules.slug', 'bantuan')
            ->where('module_access.user_id', $userId)->where('users.is_active', true)->first(['module_access.role', 'bantuan_staff.roles']);
        return $member && in_array($role, self::expandRoles($member->role, $member->roles), true);
    }

    public function bypass(Request $request): bool
    {
        return $this->role($request) === 'admin' || (in_array($this->role($request), ['call_center', 'verifier'], true)
            && (bool) DB::table('bantuan_staff')->where('user_id', $request->user()->id)->value('can_bypass'));
    }
}
