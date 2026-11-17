<?php

namespace App\Modules\Keuangan\Services;

use Illuminate\Http\Request;

/** Capabilities remain restricted to the current Core role; legacy grants are not imported. */
class KeuanganAccess
{
    public const ROLES = [
        'finance_admin' => 'Admin Keuangan',
        'treasurer' => 'Bendahara',
        'approver' => 'Ketua / approver',
        'operator' => 'Admin Operasional',
    ];

    public function context(Request $request): array
    {
        $role = $request->attributes->get('module_role');
        abort_unless(in_array($role, ['superadmin', 'admin', ...array_keys(self::ROLES)], true), 403);

        $master = in_array($role, ['superadmin', 'admin', 'finance_admin', 'treasurer'], true);

        return [
            'role' => $role,
            'roleLabel' => match ($role) {
                'superadmin' => 'Superadmin',
                'admin' => 'Administrator modul',
                default => self::ROLES[$role],
            },
            'canReadMasters' => $master,
            'canWriteExpenses' => in_array($role, ['superadmin', 'admin', 'finance_admin', 'operator'], true),
            'canWriteMasters' => in_array($role, ['superadmin', 'admin', 'finance_admin'], true),
            'canReadApprovals' => $role !== 'operator',
            'canManageAccounts' => in_array($role, ['superadmin', 'admin'], true),
        ];
    }
}
