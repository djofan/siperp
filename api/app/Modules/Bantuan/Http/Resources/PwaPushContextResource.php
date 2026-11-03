<?php

namespace App\Modules\Bantuan\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PwaPushContextResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'enabled' => $this->resource['enabled'], 'registered' => $this->resource['registered'],
            'userId' => $this->resource['userId'], 'binding' => $this->resource['binding'],
            'firebase' => $this->resource['firebase'], 'vapidKey' => $this->resource['vapidKey'],
        ];
    }
}
