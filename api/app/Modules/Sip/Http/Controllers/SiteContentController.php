<?php

namespace App\Modules\Sip\Http\Controllers;

use App\Modules\Sip\Models\SipSiteContent;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class SiteContentController
{
    private const KEYS = ['hero', 'berita', 'program', 'penyaluranBantuan', 'tentang', 'jangkauanBantuan', 'laporan', 'kontak', 'layanan', 'footer'];

    public function show(string $key): JsonResponse
    {
        abort_unless(in_array($key, self::KEYS, true), 404);
        $row = SipSiteContent::where('section_key', $key)->first();

        return response()->json(['data' => $row ? json_decode($row->contentJson, true, flags: JSON_THROW_ON_ERROR) : null]);
    }

    public function update(Request $request, string $key): JsonResponse
    {
        abort_unless(in_array($key, self::KEYS, true), 404);
        $data = $request->validate(['content' => 'required|array', 'content.*' => 'nullable|string|max:100000']);
        // Laravel converts empty form strings to null. Optional content must stay
        // an empty string so the editor and public defaults keep the same contract.
        $data['content'] = array_map(fn ($value) => $value ?? '', $data['content']);
        if ($key === 'layanan') {
            foreach (array_filter(array_map('trim', explode("\n", $data['content']['faq'] ?? ''))) as $line) {
                $parts = explode('|', $line, 2);
                if (count($parts) !== 2 || ! trim($parts[0]) || ! trim($parts[1])) {
                    throw ValidationException::withMessages(['content.faq' => 'Format FAQ: satu pasangan Pertanyaan | Jawaban per baris.']);
                }
            }
        }
        $row = SipSiteContent::where('section_key', $key)->first() ?? new SipSiteContent;
        $row->forceFill(['sectionKey' => $key, 'contentJson' => json_encode($data['content'], JSON_THROW_ON_ERROR)])->save();

        return response()->json(['ok' => true]);
    }
}
