<?php

namespace App\Modules\Core\Http\Controllers;

use App\Modules\Core\Models\User;
use App\Modules\Core\Services\ManagedAccounts;
use App\Modules\Core\Services\UserService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class AccountPasswordResetController
{
    public function __invoke(Request $request, string $id, ManagedAccounts $accounts, UserService $users)
    {
        $actor = $request->user();
        abort_if($id === $actor->id, 403, 'Gunakan Pengaturan akun untuk mengganti password sendiri.');
        $managedIds = array_column($accounts->modules($actor), 'id');
        abort_unless($actor->is_superadmin || $managedIds, 403, 'Hanya admin modul dan superadmin yang dapat mereset password.');

        return DB::transaction(function () use ($request, $id, $actor, $managedIds, $users) {
            $target = User::whereKey($id)->lockForUpdate()->firstOrFail();
            $access = DB::table('module_access')->where('user_id', $id)->lockForUpdate()->get();
            abort_if($target->is_superadmin || preg_match('/^AMSIP[0-9]+$/D', $target->code) || $access->contains('role', 'admin'), 403, 'Fitur ini hanya untuk akun operasional.');
            abort_unless($access->isNotEmpty(), 403, 'Akun tidak memiliki akses operasional.');
            abort_if(! $actor->is_superadmin && $access->contains(fn ($entry) => ! in_array($entry->module_id, $managedIds, true)), 403, 'Akun di luar cakupan atau lintas modul hanya dapat direset oleh superadmin yang berwenang.');

            $input = $request->validate(['password' => 'required|string|min:12|max:72|confirmed']);
            $target->forceFill(['password_hash' => Hash::make($input['password'])])->save();
            $target->tokens()->delete();
            $users->log($actor->name.' mereset password akun operasional '.$target->name.' ('.$target->code.')');

            return response()->json(['ok' => true, 'data' => ['id' => $target->id, 'code' => $target->code]])
                ->header('Cache-Control', 'no-store, private');
        });
    }
}
