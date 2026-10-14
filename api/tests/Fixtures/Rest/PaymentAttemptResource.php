<?php

namespace Tests\Fixtures\Rest;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PaymentAttemptResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->resource['id'], 'name' => $this->resource['name'], 'amount' => $this->resource['amount'], 'status' => $this->resource['status']];
    }
}
