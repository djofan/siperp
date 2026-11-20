<?php

namespace App\Modules\Lazsip\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class AffiliateLoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('email'))) {
            $this->merge(['email' => strtolower(trim($this->input('email')))]);
        }
    }

    public function rules(): array
    {
        return ['email' => ['bail', 'required', 'string', 'email', 'max:191'],
            'password' => ['required', 'string', 'max:72'], 'remember' => ['sometimes', 'boolean']];
    }

    public function messages(): array
    {
        return ['email.required' => 'Email wajib diisi.', 'email.email' => 'Masukkan alamat email yang valid.'];
    }
}
