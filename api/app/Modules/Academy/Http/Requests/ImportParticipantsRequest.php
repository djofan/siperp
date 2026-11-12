<?php

namespace App\Modules\Academy\Http\Requests;

use App\Modules\Academy\Services\AcademyContext;
use Illuminate\Foundation\Http\FormRequest;

class ImportParticipantsRequest extends FormRequest
{
    public function authorize(): bool
    {
        app(AcademyContext::class)->admin($this);

        return true;
    }

    public function rules(): array
    {
        return [
            'cohortId' => 'required|string|exists:academy_cohorts,id',
            'gender' => 'required|in:IKHWAN,AKHWAT',
            'rows' => 'required|array|list|min:1|max:200',
            'rows.*' => 'required|array:rowNumber,name,phone,address',
            'rows.*.rowNumber' => 'required|integer|min:2|max:10001',
            'rows.*.name' => 'required|string|min:2|max:100',
            'rows.*.phone' => ['required', 'string', 'regex:/^628\d{7,12}$/D', 'distinct:strict'],
            'rows.*.address' => 'required|string|max:2000',
        ];
    }

    protected function prepareForValidation(): void
    {
        $rows = $this->input('rows');
        if (! is_array($rows)) return;
        foreach ($rows as &$row) {
            if (! is_array($row)) continue;
            foreach (['name', 'address', 'phone'] as $field) {
                if (isset($row[$field]) && is_string($row[$field])) $row[$field] = trim($row[$field]);
            }
            if (! isset($row['phone']) || ! is_string($row['phone'])) continue;
            $phone = preg_replace('/[\s()+.\-]/', '', $row['phone']);
            if (str_starts_with($phone, '08')) $phone = '62'.substr($phone, 1);
            elseif (str_starts_with($phone, '8')) $phone = '62'.$phone;
            $row['phone'] = $phone;
        }
        $this->merge(['rows' => $rows]);
    }

    public function attributes(): array
    {
        $attributes = ['cohortId' => 'angkatan', 'gender' => 'grup', 'rows' => 'data peserta'];
        foreach (array_slice((array) $this->input('rows', []), 0, 200, true) as $index => $row) {
            $number = is_array($row) && is_numeric($row['rowNumber'] ?? null) ? (int) $row['rowNumber'] : (is_int($index) ? $index + 2 : 0);
            foreach (['name' => 'nama', 'phone' => 'nomor HP', 'address' => 'alamat', 'rowNumber' => 'nomor baris'] as $field => $label) {
                $attributes["rows.$index.$field"] = "$label pada baris $number";
            }
        }

        return $attributes;
    }

    public function messages(): array
    {
        return [
            'required' => ':attribute wajib diisi.', 'string' => ':attribute harus berupa teks.',
            'rows.max' => 'Maksimal 200 peserta dalam satu impor.',
            'rows.*.name.min' => ':attribute minimal 2 karakter.',
            'rows.*.name.max' => ':attribute maksimal 100 karakter.',
            'rows.*.address.max' => ':attribute maksimal 2.000 karakter.',
            'rows.*.phone.regex' => ':attribute tidak valid. Gunakan nomor HP Indonesia, misalnya 081234567890.',
            'rows.*.phone.distinct' => ':attribute berulang di dalam file. Hapus baris duplikat terlebih dahulu.',
            'cohortId.exists' => 'Angkatan tidak ditemukan. Pilih kembali angkatan peserta.',
            'gender.in' => 'Pilih grup Ikhwan atau Akhwat.',
        ];
    }
}
