<?php

namespace App\Modules\Keuangan\Services;

use Illuminate\Http\Request;

/** Foundation capabilities are read-only. No legacy grants or identities are imported. */
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
            'canReadApprovals' => $role !== 'operator',
            'canManageAccounts' => in_array($role, ['superadmin', 'admin'], true),
        ];
    }
}
