<?php

namespace App\Modules\Lazsip\Http\Requests;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\DB;

class AffiliateRegistrationRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        foreach (['name', 'email', 'phone'] as $key) {
            if (is_string($this->input($key))) {
                $this->merge([$key => trim($this->input($key))]);
            }
        }
        if (is_string($this->input('email'))) {
            $this->merge(['email' => strtolower($this->input('email'))]);
        }
    }

    public function rules(): array
    {
        return [
            'name' => ['bail', 'required', 'string', 'min:2', 'max:100'],
            'email' => ['bail', 'required', 'string', 'email', 'max:191', function (string $attribute, mixed $value, Closure $fail): void {
                if (DB::table('users')->whereRaw('LOWER(email) = ?', [$value])->exists()) {
                    $fail('Email sudah terdaftar. Silakan masuk menggunakan email Anda.');
                }
            }],
            'phone' => ['bail', 'required', 'string', 'max:30', 'regex:/^\+?[0-9]{8,15}$/D'],
            'password' => ['bail', 'required', 'string', 'min:12', 'max:72', 'confirmed', function (string $attribute, mixed $value, Closure $fail): void {
                if (strlen($value) > 72) {
                    $fail('Password maksimal 72 byte.');
                }
            }],
        ];
    }

    public function messages(): array
    {
        return ['phone.regex' => 'Nomor telepon harus berisi 8–15 angka, boleh diawali +.',
            'password.min' => 'Password minimal 12 karakter.', 'password.confirmed' => 'Konfirmasi password tidak sama.'];
    }
}
