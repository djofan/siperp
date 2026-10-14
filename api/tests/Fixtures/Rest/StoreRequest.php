<?php

namespace Tests\Fixtures\Rest;

use App\Http\Requests\IdempotentCreationRequest;

class StoreRequest extends IdempotentCreationRequest
{
    public function rules(): array
    {
        return array_merge(parent::rules(), ['name' => ['required', 'string', 'max:100'], 'amount' => ['required', 'integer', 'min:1'], 'id' => ['prohibited'], 'status' => ['prohibited']]);
    }
}
