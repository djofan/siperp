<?php

namespace Tests\Fixtures\Rest;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $presence = $this->isMethod('PUT') ? 'required' : 'sometimes';

        return ['name' => [$presence, 'string', 'max:100'], 'amount' => [$presence, 'integer', 'min:1'], 'status' => [$presence, Rule::in(['pending', 'cancelled'])], 'id' => ['prohibited']];
    }

    public function after(): array
    {
        return [function ($validator): void {
            if ($this->isMethod('PATCH') && ! $this->hasAny(['name', 'amount', 'status'])) {
                $validator->errors()->add('body', 'At least one writable field is required.');
            }
        }];
    }
}
