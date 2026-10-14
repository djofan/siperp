<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

abstract class CollectionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    abstract protected function allowedFilters(): array;

    abstract protected function allowedSorts(): array;

    public function rules(): array
    {
        return [
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'filter' => ['sometimes', 'array:'.implode(',', $this->allowedFilters())],
            'sort' => ['sometimes', 'string', Rule::in($this->allowedSorts())],
            'q' => ['sometimes', 'nullable', 'string', 'max:200'],
        ];
    }

    public function pageNumber(): int
    {
        return (int) $this->validated('page', 1);
    }

    public function perPage(): int
    {
        return (int) $this->validated('per_page', 25);
    }
}
