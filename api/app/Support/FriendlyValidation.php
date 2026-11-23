<?php

namespace App\Support;

use Illuminate\Validation\ValidationException;

class FriendlyValidation
{
    private const LABELS = [
        'name' => 'Nama lengkap',
        'title' => 'Judul',
        'description' => 'Deskripsi',
        'content' => 'Isi',
        'email' => 'Email',
        'phone' => 'Nomor HP',
        'password' => 'Password',
        'password_confirmation' => 'Konfirmasi password',
        'uniqueCode' => 'Kode unik',
        'unique_code' => 'Kode unik',
        'code' => 'Kode',
        'amount' => 'Nominal',
        'targetAmount' => 'Target nominal',
        'currentAmount' => 'Saldo',
        'image' => 'Gambar',
        'logo' => 'Logo',
        'file' => 'Berkas',
        'files' => 'Berkas',
        'caption' => 'Keterangan foto',
        'status' => 'Status',
        'source' => 'Sumber',
        'region' => 'Wilayah',
        'address' => 'Alamat',
        'street' => 'Alamat',
        'nik' => 'NIK',
        'birthDate' => 'Tanggal lahir',
        'birthPlace' => 'Tempat lahir',
        'gender' => 'Jenis kelamin',
        'housing' => 'Status rumah',
        'rent' => 'Biaya sewa',
        'rentPeriod' => 'Periode sewa',
        'income' => 'Penghasilan',
        'incomePeriod' => 'Periode penghasilan',
        'dependentCount' => 'Jumlah tanggungan',
        'dependents' => 'Tanggungan',
        'relationship' => 'Hubungan',
        'age' => 'Usia',
        'problem' => 'Masalah yang dihadapi',
        'previousAid' => 'Riwayat bantuan',
        'previousAidDetails' => 'Detail bantuan sebelumnya',
        'program' => 'Program bantuan',
        'reason' => 'Alasan',
        'notes' => 'Catatan',
        'date' => 'Tanggal',
        'startDate' => 'Tanggal mulai',
        'endDate' => 'Tanggal selesai',
        'role' => 'Peran akun',
        'roles' => 'Peran akun',
        'userId' => 'Akun',
        'accountId' => 'Akun',
        'bank' => 'Bank',
        'accountNumber' => 'Nomor rekening',
        'accountName' => 'Nama pemilik rekening',
        'recipientName' => 'Nama penerima',
        'transferDate' => 'Tanggal transfer',
        'transferProof' => 'Bukti transfer',
        'verifierId' => 'Verifikator',
        'distributorId' => 'Penyalur',
        'distributionType' => 'Jenis penyaluran',
        'version' => 'Versi data',
        'duration' => 'Durasi',
        'recording' => 'Rekaman',
        'audio' => 'Rekaman',
        'video' => 'Video',
        'participants' => 'Peserta',
        'meetingDate' => 'Tanggal rapat',
        'location' => 'Lokasi',
        'summary' => 'Ringkasan',
        'agenda' => 'Agenda',
        'task' => 'Tugas',
        'assignee' => 'Penanggung jawab',
        'dueDate' => 'Tenggat',
        'question' => 'Pertanyaan',
        'answer' => 'Jawaban',
        'options' => 'Pilihan jawaban',
        'score' => 'Nilai',
        'quantity' => 'Jumlah',
        'price' => 'Harga',
        'cost' => 'Biaya',
        'estimate' => 'Estimasi biaya',
        'finalPrice' => 'Harga akhir',
        'capital' => 'Modal',
        'customerName' => 'Nama pelanggan',
        'customerPhone' => 'Nomor HP pelanggan',
        'device' => 'Perangkat',
        'complaint' => 'Keluhan',
        'publicationConsent' => 'Persetujuan publikasi',
        'isPinned' => 'Pin campaign',
        'documentationPhotos' => 'Dokumentasi',
        'reporter' => 'Pelapor',
        'applicant' => 'Pemohon',
        'survey' => 'Survei',
        'handover' => 'Penyerahan',
        'rtRw' => 'RT/RW',
        'village' => 'Desa/kelurahan',
        'district' => 'Kecamatan',
        'city' => 'Kota/kabupaten',
        'job' => 'Pekerjaan',
        'informationSource' => 'Sumber informasi'
    ];

    public static function details(ValidationException $error): array
    {
        $failed = $error->validator->failed();
        $result = [];
        foreach ($error->errors() as $field => $messages) {
            $parts = explode('.', $field);
            $key = collect($parts)->reverse()->first(fn ($part) => !ctype_digit((string) $part));
            $label = self::LABELS[$field] ?? self::LABELS[$key] ?? 'Isian';
            foreach ($parts as $part) if (ctype_digit((string) $part)) { $label .= ' pada baris '.((int) $part + 1); break; }
            $rules = $failed[$field] ?? [];
            $types = $error->validator->getRules()[$field] ?? [];
            $string = in_array('string', $types, true);
            $file = in_array('file', $types, true) || in_array('image', $types, true);
            $result[$field] = array_map(function ($message) use ($label, $rules, $string, $file) {
                if (!preg_match('/^The .+ (?:field|must|is|has)|^validation\./i', $message)) {
                    return $label !== 'Isian' && !str_contains(mb_strtolower($message), mb_strtolower($label)) ? $label.': '.$message : $message;
                }
                foreach ($rules as $rule => $args) {
                    $n = $args[0] ?? '';
                    $text = match ($rule) {
                        'Required', 'RequiredIf', 'RequiredUnless', 'RequiredWith', 'RequiredWithout', 'Present', 'Filled', 'Accepted' => 'wajib diisi.',
                        'Unique' => 'sudah digunakan. Gunakan yang berbeda.',
                        'Confirmed' => 'tidak cocok dengan konfirmasi. Periksa kembali.',
                        'Email' => 'harus berupa alamat email yang valid.',
                        'Integer', 'Numeric', 'Decimal' => 'harus berupa angka yang valid.',
                        'In', 'Exists', 'NotIn', 'Enum' => 'tidak tersedia. Pilih kembali dari pilihan yang ada.',
                        'Digits' => "harus terdiri dari {$n} digit angka.",
                        'Min' => "minimal {$n}".($string ? ' karakter.' : ($file ? ' KB.' : '.')),
                        'Max' => "maksimal {$n}".($string ? ' karakter.' : ($file ? ' KB.' : '.')),
                        'Between' => 'harus berada antara '.implode(' dan ', $args).'.',
                        'Date', 'DateFormat', 'Before', 'BeforeOrEqual', 'After', 'AfterOrEqual' => 'belum sesuai. Periksa tanggal yang diisi.',
                        'Mimes', 'Mimetypes', 'Extensions' => 'harus menggunakan format: '.implode(', ', $args).'.',
                        'Image' => 'harus berupa gambar yang valid.',
                        'Url', 'ActiveUrl' => 'harus berupa tautan yang valid.',
                        'Regex', 'NotRegex' => 'belum sesuai format yang diminta.',
                        'Array' => 'harus berupa daftar pilihan yang valid.',
                        'Boolean' => 'harus dipilih ya atau tidak.',
                        default => null,
                    };
                    if ($text !== null) return $label.' '.$text;
                }
                return $label.' belum sesuai. Periksa kembali isian ini.';
            }, $messages);
        }
        return $result;
    }
}
