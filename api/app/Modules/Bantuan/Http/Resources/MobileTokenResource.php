<?php

namespace App\Modules\Bantuan\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MobileTokenResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'token' => $this->resource->plainTextToken,
            'expires_at' => $this->resource->accessToken->expires_at->toIso8601String(),
        ];
    }
}
