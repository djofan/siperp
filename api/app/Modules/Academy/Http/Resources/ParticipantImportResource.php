<?php

namespace App\Modules\Academy\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ParticipantImportResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'createdCount' => $this->resource['createdCount'],
            'skippedCount' => $this->resource['skippedCount'],
            // Initial passwords are disclosed only in this authorized, no-store response.
            'credentials' => array_map(fn (array $row) => [
                'name' => $row['name'], 'phone' => $row['phone'], 'code' => $row['code'], 'password' => $row['password'],
            ], $this->resource['credentials']),
        ];
    }
}
