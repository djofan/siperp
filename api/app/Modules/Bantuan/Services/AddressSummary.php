<?php
namespace App\Modules\Bantuan\Services;

class AddressSummary
{
    public static function make(array $applicant, ?string $region = null): string
    {
        $clean = static fn ($value) => trim(preg_replace('/^(?:kecamatan|kec\.?|kabupaten|kab\.?|kota)\s+/iu', '', trim((string) $value)) ?? '');
        $structured = array_values(array_unique(array_filter(array_map($clean, [$applicant['district'] ?? '', $applicant['city'] ?? '']))));
        if (count($structured) >= 2) return mb_substr(implode(', ', $structured), 0, 100);
        $street = trim((string) ($applicant['street'] ?? ''));
        preg_match_all('/(?:kecamatan|kec\.?|kabupaten|kab\.?|kota)\s+([^,;]+?)(?=,|;|\s+(?:kecamatan|kec\.?|kabupaten|kab\.?|kota|provinsi)\s|$)/iu', $street, $matches);
        $parts = array_map($clean, $matches[1] ?? []);
        if (!$parts) {
            $chunks = preg_split('/[,;\n]+/u', $street) ?: [];
            // Only locality-like trailing parts: never expose house numbers or the street line.
            $parts = array_filter(array_slice($chunks, 1), static fn ($value) => !preg_match('/\d|^(?:jl\.?|jalan|rt\.?|rw\.?|blok|no\.?|indonesia|provinsi|jawa|sumatera|sumatra|kalimantan|sulawesi|papua|bali|banten|nusa|maluku|aceh|lampung|riau|bengkulu|jambi|gorontalo|dki|di yogyakarta)/iu', trim($value)));
            $parts = array_slice(array_map($clean, $parts), -2);
        }
        $parts = array_values(array_unique(array_filter([...$structured, ...$parts])));
        return mb_substr(implode(', ', array_slice($parts, -2)) ?: $clean($region), 0, 100);
    }
}
