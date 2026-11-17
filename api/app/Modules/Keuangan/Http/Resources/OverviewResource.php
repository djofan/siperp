<?php

namespace App\Modules\Keuangan\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;

class OverviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'phase' => 'workflow',
            'readOnly' => ! DB::table('modules')->where('slug', 'keuangan')->value('is_active'),
            'role' => $this->resource['role'],
            'roleLabel' => $this->resource['roleLabel'],
            'permissions' => [
                'writeExpenses' => $this->resource['canWriteExpenses'],
                'writeMasters' => $this->resource['canWriteMasters'],
                'readMasters' => $this->resource['canReadMasters'],
                'readApprovals' => $this->resource['canReadApprovals'],
                'manageAccounts' => $this->resource['canManageAccounts'],
            ],
            'counts' => [
                'expenses' => $this->resource['expenses'],
                'sources' => $this->resource['sources'],
                'categories' => $this->resource['categories'],
                'myPendingApprovals' => $this->resource['myPendingApprovals'],
            ],
        ];
    }

    public function withResponse(Request $request, $response): void
    {
        $response->header('Cache-Control', 'no-store, private');
    }
}
