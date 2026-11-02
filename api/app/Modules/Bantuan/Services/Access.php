<?php

namespace App\Modules\Bantuan\Services;

use App\Modules\Bantuan\Models\Application;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class Access
{
    public const ROLES = ['admin', 'requester', 'call_center', 'approver', 'verifier', 'volunteer', 'fund_requester', 'treasurer', 'chair'];

    private const SENSITIVE_ROLES = ['admin', 'requester', 'call_center', 'approver', 'verifier', 'chair'];

    public function role(Request $request): string
    {
        $roles = $this->roles($request);
        $actor = $request->attributes->get('bantuan_actor_role');
        return in_array($actor, $roles, true) ? $actor : $roles[0];
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

    public function has(Request $request, array $roles): bool
    {
        return (bool) array_intersect($this->roles($request), $roles);
    }

    public function allow(Request $request, array $roles): string
    {
        $granted = $this->roles($request);
        $eligible = array_values(array_intersect($roles, $granted));
        $role = in_array('admin', $granted, true) ? 'admin' : ($eligible[0] ?? null);
        abort_unless($role, 403, 'Peran Anda tidak diizinkan melakukan tindakan ini.');
        $request->attributes->set('bantuan_actor_role', $role);
        return $role;
    }

    public const ONGOING = ['needs_data', 'screening', 'review1', 'survey_assignment', 'survey_assigned', 'survey_cc_review', 'survey_submitted', 'bypass_review', 'review2', 'approved', 'fund_ready', 'fund_submitted', 'fund_approved', 'disbursed', 'delivery_failed'];

    public function canMonitor(Request $request): bool
    {
        return $this->has($request, ['admin', 'call_center', 'requester', 'approver', 'chair', 'fund_requester', 'treasurer']);
    }

    public function scope($query, Request $request)
    {
        return $this->scopeRoles($query, $request, $this->roles($request));
    }

    public function scopeSensitive($query, Request $request)
    {
        return $this->scopeRoles($query, $request, array_intersect($this->roles($request), self::SENSITIVE_ROLES));
    }

    private function scopeRoles($query, Request $request, array $roles)
    {
        if (array_intersect($roles, ['admin', 'call_center', 'approver', 'chair'])) return $query;

        // Keep the union grouped so subsequent filters cannot widen visibility.
        return $query->where(function ($scope) use ($roles, $request) {
            $scope->whereRaw('1 = 0');
            if (array_intersect($roles, ['requester', 'verifier'])) $scope->orWhere('created_by', $request->user()->id);
            if (in_array('verifier', $roles, true)) {
                $scope->orWhere('verifier_id', $request->user()->id)->orWhere('distributor_id', $request->user()->id);
            }
            if (array_intersect($roles, ['fund_requester', 'treasurer'])) $scope->orWhereNotNull('amount');
        });
    }

    public function find(Request $request, string $id, bool $lock = false): Application
    {
        $q = $this->scope(Application::query(), $request);

        return ($lock ? $q->lockForUpdate() : $q)->findOrFail($id);
    }

    public function sensitive(Request $request, ?Application $row = null): bool
    {
        if ($this->has($request, ['admin', 'call_center', 'approver', 'chair'])) return true;
        if (! $row) return $this->has($request, ['requester', 'verifier']);
        $userId = $request->user()->id;
        return ($row->created_by === $userId && $this->has($request, ['requester', 'verifier']))
            || ($this->has($request, ['verifier']) && in_array($userId, [$row->verifier_id, $row->distributor_id], true));
    }

    public function documentRole(Request $request, Application $row, string $kind): string
    {
        $own = $row->created_by === $request->user()->id;
        $roles = match (true) {
            in_array($kind, ['face', 'ktp', 'kk', 'supporting'], true) => in_array($row->status, ['draft', 'needs_data', 'screening'], true)
                ? ['call_center', ...($own ? ['verifier'] : []), ...($own && $row->status !== 'screening' ? ['requester'] : [])] : [],
            str_starts_with($kind, 'survey_') || $kind === 'sktm' => $row->status === 'survey_assigned' && $row->verifier_id === $request->user()->id ? ['verifier'] : [],
            in_array($kind, ['transfer', 'return'], true) => in_array($row->status, ['fund_approved', 'disbursed', 'delivery_failed'], true) ? ['treasurer'] : [],
            default => $row->status === 'disbursed' ? ($row->distribution_type === 'direct' ? ['treasurer']
                : ($row->distribution_type === 'verifier' && $row->distributor_id === $request->user()->id ? ['verifier'] : [])) : [],
        };
        return $this->allow($request, $roles);
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
        return $this->has($request, ['admin']) || ($this->has($request, ['call_center', 'verifier'])
            && (bool) DB::table('bantuan_staff')->where('user_id', $request->user()->id)->value('can_bypass'));
    }
}
