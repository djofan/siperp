<?php

namespace App\Modules\Teknisi\Http\Controllers;

use App\Modules\Teknisi\Models\TeknisiParticipant;
use App\Modules\Teknisi\Services\TeknisiContext;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProfileController
{
    public function update(Request $request, TeknisiContext $context)
    {
        $actor = $context->actor($request, true);
        abort_unless($actor['role'] === 'technician', 403, 'Pengaturan ini hanya untuk akun teknisi operasional.');
        $data = $request->validate([
            'name' => 'required|string|min:2|max:191',
            'phone' => ['required', 'string', 'max:32', 'regex:/^\+?[0-9 ()-]+$/', function ($attribute, $value, $fail) {
                $length = strlen(preg_replace('/[^0-9]/', '', $value));
                if ($length < 8 || $length > 15) $fail('Nomor HP harus berisi 8 sampai 15 digit.');
            }],
            'address' => 'required|string|max:1000',
            'userId' => 'prohibited', 'id' => 'prohibited', 'nip' => 'prohibited',
            'role' => 'prohibited', 'outletId' => 'prohibited', 'isActive' => 'prohibited',
        ]);
        return DB::transaction(function () use ($actor, $data) {
            $user = $actor['user']->newQuery()->lockForUpdate()->findOrFail($actor['user']->id);
            $profile = TeknisiParticipant::where('userId', $user->id)->whereNull('deleted_at')->lockForUpdate()->firstOrFail();
            $name = trim($data['name']);
            abort_if($name === '' || trim($data['address']) === '', 422, 'Nama dan alamat tidak boleh kosong.');
            $user->forceFill(['name' => $name])->save();
            $profile->forceFill(['phone' => preg_replace('/[ ()-]/', '', $data['phone']), 'address' => trim($data['address'])])->save();
            $actor['tech']->forceFill(['name' => $name])->save();
            return response()->json(['data' => ['name' => $name, 'phone' => $profile->phone, 'address' => $profile->address, 'nip' => $profile->nip]])->header('Cache-Control', 'no-store, private');
        });
    }
}
