<?php

namespace App\Modules\Core\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class HealthResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['status' => $this->resource['status'], 'database' => $this->resource['database']];
    }
}
