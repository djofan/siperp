<?php

namespace App\Modules\Core\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return ['code' => ['required', 'string', 'max:32', 'regex:/^[a-zA-Z0-9][a-zA-Z0-9_-]{2,31}$/D'], 'password' => ['required', 'string', 'max:72']];
    }

    protected function prepareForValidation(): void
    {
        if (is_string($this->input('code'))) $this->merge(['code' => trim($this->input('code'))]);
    }

    public function messages(): array
    {
        return ['code.required' => 'Kode akun wajib diisi.', 'code.regex' => 'Masukkan kode akun, bukan email.', 'code.max' => 'Kode akun maksimal 32 karakter.'];
    }
}
