<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

abstract class IdempotentCreationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function validationData(): array
    {
        // Always use the header; a body field cannot impersonate it.
        return array_merge(parent::validationData(), ['idempotency_key' => $this->header('Idempotency-Key')]);
    }

    public function rules(): array
    {
        return ['idempotency_key' => ['required', 'string', 'min:1', 'max:128', 'regex:/^[A-Za-z0-9._:-]+$/D']];
    }
}
