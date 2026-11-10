<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ErrorResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return ['error' => array_merge(['code' => $this->resource['code'], 'message' => $this->resource['message'], 'details' => $this->resource['details']],
            array_intersect_key($this->resource, array_flip(['diagnosticCode', 'requestId', 'retryAfter'])))];
    }
}
