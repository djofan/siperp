<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ErrorResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return ['error' => ['code' => $this->resource['code'], 'message' => $this->resource['message'], 'details' => $this->resource['details']]];
    }
}
