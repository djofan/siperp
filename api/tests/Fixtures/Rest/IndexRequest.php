<?php

namespace Tests\Fixtures\Rest;

use App\Http\Requests\CollectionRequest;
use Illuminate\Validation\Rule;

class IndexRequest extends CollectionRequest
{
    protected function allowedFilters(): array
    {
        return ['status'];
    }

    protected function allowedSorts(): array
    {
        return ['name', '-name', 'amount', '-amount'];
    }

    public function rules(): array
    {
        return array_merge(parent::rules(), ['filter.status' => ['sometimes', 'string', Rule::in(['pending', 'cancelled'])]]);
    }
}
