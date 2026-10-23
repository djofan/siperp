<?php

namespace App\Modules\Core\Http\Controllers;

use App\Modules\Core\Models\User;
use App\Support\ParticipantModules;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class ParticipantController
{
    private function input(Request $request, string $module, bool $create): array
    {
        $phone = preg_replace('/[\s()+.\-]/', '', (string) $request->input('phone'));
        if (str_starts_with($phone, '0')) $phone = '62'.substr($phone, 1);
        $request->merge(['phone' => $phone]);
        $rules = ['name' => 'required|string|min:2|max:100', 'address' => 'required|string|max:2000', 'phone' => ['required', 'regex:/^628\d{7,12}$/'], 'password' => ($create ? 'required' : 'nullable').'|string|min:10', 'specialty' => 'nullable|string|max:191', 'outletId' => 'nullable|string', 'courseId' => 'nullable|string'];
        $data = $request->validate([...$rules, ...app(ParticipantModules::class)->for($module)->extraRules()]);
        abort_if(strlen($data['password'] ?? '') > 72, 422, 'Password maksimal 72 byte.');
        return $data;
    }

    private function target(string $module, string $id): User
    {
        $userId = app(ParticipantModules::class)->for($module)->userIdFor($id);
        $user = User::whereKey($userId)->lockForUpdate()->firstOrFail();
        abort_if($user->is_superadmin || DB::table('module_access')->join('modules', 'modules.id', '=', 'module_access.module_id')->where('user_id', $user->id)->where('modules.slug', $module)->whereIn('role', ['admin', 'manager', 'teacher'])->exists(), 403, 'Akun pengelola tidak dapat diubah melalui panel peserta.');
        return $user;
    }

    public function store(Request $request, string $module) { return $this->create($request, $module, false); }
    public function registerAcademy(Request $request) { return $this->create($request, 'academy', true); }

    private function create(Request $request, string $module, bool $public)
    {
        $adapter = app(ParticipantModules::class)->for($module);
        if ($public) $adapter->publicSetup($request);
        else $adapter->authorize($request);
        $data = $this->input($request, $module, true);
        if ($public) $data['email'] = strtolower(trim($request->input('email')));
        $result = DB::transaction(function () use ($module, $data, $adapter) {
            DB::table('participant_sequences')->insertOrIgnore(['module_slug' => $module, 'last_number' => 0]);
            $counter = DB::table('participant_sequences')->where('module_slug', $module)->lockForUpdate()->first();
            $number = $counter->last_number + 1;
            DB::table('participant_sequences')->where('module_slug', $module)->update(['last_number' => $number]);
            [$prefix, $width] = $adapter->codeFormat();
            $nip = $prefix.str_pad((string) $number, $width, '0', STR_PAD_LEFT);
            $user = new User;
            $user->name = $data['name'];
            $user->email = $data['email'] ?? strtolower($nip).'@peserta.sip.invalid';
            $user->password_hash = Hash::make($data['password']);
            $user->save();
            $adapter->createProfile($user->id, $data, $nip);
            return ['userId' => $user->id, 'nip' => $nip];
        }, 3);
        return response()->json(['data' => $result], 201);
    }

    public function update(Request $request, string $module, string $id)
    {
        $adapter = app(ParticipantModules::class)->for($module);
        $adapter->authorize($request);
        $data = $this->input($request, $module, false);
        DB::transaction(function () use ($module, $id, $data, $adapter) {
            $user = $this->target($module, $id);
            $user->name = $data['name'];
            if (! empty($data['password'])) {
                $user->password_hash = Hash::make($data['password']);
                $user->tokens()->delete();
            }
            $user->save();
            $adapter->updateProfile($id, $user->id, $data);
        }, 3);
        return response()->json(['data' => true]);
    }

    public function destroy(Request $request, string $module, string $id)
    {
        $adapter = app(ParticipantModules::class)->for($module);
        $adapter->authorize($request);
        DB::transaction(function () use ($module, $id, $adapter) {
            $user = $this->target($module, $id);
            $adapter->removeProfile($id, $user->id);
            DB::table('module_access')->where('user_id', $user->id)->whereIn('module_id', DB::table('modules')->where('slug', $module)->select('id'))->delete();
            $other = DB::table('module_access')->where('user_id', $user->id)->exists() || app(ParticipantModules::class)->hasMembership($user->id);
            if (! $other) {
                $user->is_active = false;
                $user->save();
                $user->tokens()->delete();
            }
        }, 3);
        return response()->json(['data' => true]);
    }
}
