<?php

namespace App\Modules\Core\Services;

use App\Modules\Core\Models\User;
use CaliCastle\Cuid;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class UserService
{
    public function create(array $input): User
    {
        return DB::transaction(function () use ($input): User {
            $user = new User;
            $user->forceFill(['name' => trim($input['name']), 'email' => trim($input['email']), 'password_hash' => Hash::make($input['password']), 'is_superadmin' => $input['isSuperadmin'] ?? false, 'is_active' => true]);
            $user->save();
            $user->refresh();
            $this->log("Akun {$user->name} dibuat".($user->is_superadmin ? ' sebagai superadmin' : ''));
            if (! $user->is_superadmin) {
                foreach (DB::table('modules')->whereIn('id', $input['moduleIds'] ?? [])->get() as $module) {
                    DB::table('module_access')->insert(['id' => Cuid::make(), 'user_id' => $user->id, 'module_id' => $module->id, 'role' => 'admin']);
                    $this->log("{$user->name} diberi akses ke {$module->name}");
                }
            }

            return $user;
        });
    }

    public function update(string $id, array $input): User
    {
        return DB::transaction(function () use ($id, $input): User {
            $user = User::findOrFail($id);
            $user->forceFill(['name' => trim($input['name']), 'email' => trim($input['email'])]);
            if (! empty($input['password'])) {
                $user->password_hash = Hash::make($input['password']);
            }
            $user->save();
            $this->log("Data akun {$user->name} diperbarui".(! empty($input['password']) ? ' (termasuk password)' : ''));

            return $user;
        });
    }

    public function setActive(string $id, bool $active): void
    {
        DB::transaction(function () use ($id, $active): void {
            // Lock the complete superadmin set, not only the target, to serialize concurrent removals.
            $admins = User::where('is_superadmin', true)->orderBy('id')->lockForUpdate()->get();
            $user = User::whereKey($id)->lockForUpdate()->firstOrFail();
            if (! $active && $user->is_superadmin && $admins->where('is_active', true)->count() <= 1) {
                throw ValidationException::withMessages(['isActive' => 'Tidak bisa menonaktifkan satu-satunya superadmin yang masih aktif.']);
            }
            $user->is_active = $active;
            $user->save();
            if (! $active) {
                $user->tokens()->delete();
            }
            $this->log("Akun {$user->name} ".($active ? 'diaktifkan' : 'dinonaktifkan'));
        });
    }

    public function delete(string $id, string $actorId): void
    {
        if ($id === $actorId) {
            throw ValidationException::withMessages(['id' => 'Tidak bisa menghapus akun yang sedang dipakai untuk login.']);
        }
        DB::transaction(function () use ($id): void {
            $admins = User::where('is_superadmin', true)->orderBy('id')->lockForUpdate()->get();
            $user = User::whereKey($id)->lockForUpdate()->firstOrFail();
            if ($user->is_superadmin && ($admins->count() <= 1 || ($user->is_active && $admins->where('is_active', true)->count() <= 1))) {
                throw ValidationException::withMessages(['id' => 'Tidak bisa menghapus satu-satunya superadmin aktif.']);
            }
            $user->tokens()->delete();
            $user->delete();
            $this->log("Akun {$user->name} dihapus");
        });
    }

    public function setAccess(string $id, array $entries): void
    {
        DB::transaction(function () use ($id, $entries): void {
            $user = User::whereKey($id)->lockForUpdate()->firstOrFail();
            $previous = DB::table('module_access')->where('user_id', $id)->pluck('role', 'module_id');
            $modules = DB::table('modules')->whereIn('id', array_column($entries, 'moduleId'))->get()->keyBy('id');
            foreach ($entries as $entry) {
                $module = $modules->get($entry['moduleId']);
                $roles = match ($module?->slug) {
                    'teknisi' => ['admin', 'manager', 'technician', 'monitoring'],
                    'academy' => ['admin', 'editor', 'teacher'],
                    'tanwir', 'ojol' => ['admin', 'guru', 'peserta'],
                    default => ['admin', 'editor'],
                };
                if (! $module || ! in_array($entry['role'], $roles, true)) {
                    throw ValidationException::withMessages(['entries' => 'Modul atau role tidak valid.']);
                }
            }
            DB::table('module_access')->where('user_id', $id)->delete();
            foreach ($entries as $entry) {
                DB::table('module_access')->insert(['id' => Cuid::make(), 'user_id' => $id, 'module_id' => $entry['moduleId'], 'role' => $entry['role']]);
                $name = $modules[$entry['moduleId']]->name;
                if (! $previous->has($entry['moduleId'])) {
                    $this->log("{$user->name} diberi akses ke {$name}");
                } elseif ($previous[$entry['moduleId']] !== $entry['role']) {
                    $this->log("Role {$user->name} di {$name} diubah jadi {$entry['role']}");
                }
            }
            foreach ($previous as $moduleId => $role) {
                if (! in_array($moduleId, array_column($entries, 'moduleId'), true)) {
                    $name = DB::table('modules')->where('id', $moduleId)->value('name') ?? $moduleId;
                    $this->log("Akses {$user->name} ke {$name} dicabut");
                }
            }
        });
    }

    public function log(string $message): void
    {
        DB::table('access_logs')->insert(['id' => Cuid::make(), 'message' => $message]);
    }
}
