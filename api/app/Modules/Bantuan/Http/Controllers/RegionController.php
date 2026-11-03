<?php
namespace App\Modules\Bantuan\Http\Controllers;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
class RegionController
{
    public function __invoke(Request $request, string $level)
    {
        $paths=['province'=>'provinces','city'=>'regencies','district'=>'districts','village'=>'villages'];
        abort_unless(isset($paths[$level]),404);
        $parent=$request->validate(['parent'=>'nullable|regex:/^[0-9]{1,13}$/D'])['parent']??'';
        abort_if($level!=='province' && $parent==='',422,'Pilih wilayah induk dahulu.');
        $path=$paths[$level].($level==='province'?'':'/'.$parent).'.json';
        try {
            $rows=Cache::remember('bantuan.regions.'.$path,86400,fn()=>Http::timeout(8)->acceptJson()->get('https://www.emsifa.com/api-wilayah-indonesia/api/'.$path)->throw()->json());
            return response()->json(['data'=>array_map(fn($r)=>['id'=>(string)$r['id'],'name'=>ucwords(strtolower($r['name']))],$rows)]);
        } catch (\Throwable) {
            return response()->json(['message'=>'Pilihan wilayah belum tersedia. Alamat lengkap tetap dapat disimpan.'],503);
        }
    }
}
