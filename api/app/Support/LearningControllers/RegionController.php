<?php

namespace App\Support\LearningControllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class RegionController extends BaseController
{
    public function __invoke(Request $request, string $level)
    {
        $this->context($request);
        abort_unless(in_array($level, ['provinsi', 'kota', 'kecamatan', 'kelurahan'], true), 404);
        $parent = $request->input('parent', $request->input('parentId', ''));
        if ($level !== 'provinsi' && (! is_string($parent) || ! preg_match('/^\d{1,13}$/D', $parent))) {
            return response()->json([]);
        }
        $path = match ($level) {
            'provinsi' => '/provinces.json', 'kota' => '/regencies/'.$parent.'.json', 'kecamatan' => '/districts/'.$parent.'.json', 'kelurahan' => '/villages/'.$parent.'.json'
        };
        try {
            $rows = Cache::remember('learning.regions.'.$level.'.'.$parent, 86400, fn () => Http::timeout(8)->acceptJson()->get('https://www.emsifa.com/api-wilayah-indonesia/api'.$path)->throw()->json());

            return response()->json(array_map(fn ($row) => ['id' => (string) $row['id'], 'name' => ucwords(strtolower($row['name']))], $rows));
        } catch (\Throwable) {
            return response()->json([]);
        }
    }
}
