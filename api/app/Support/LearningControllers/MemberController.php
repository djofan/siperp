<?php

namespace App\Support\LearningControllers;

use App\Modules\Core\Models\User;
use App\Modules\Core\Services\UserService;
use App\Support\GeocodeLearningMember;
use App\Support\LearningFileStore;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class MemberController extends BaseController
{
    public function index(Request $request)
    {
        $this->context($request, true);
        $data = $request->validate(['role' => 'required|in:guru,peserta', 'search' => 'sometimes|nullable|string|max:200']);
        $model = $this->model($request, 'Member');
        $query = $model::with(['user:id,name,email,is_active', 'group'])->where('role', $data['role']);
        if (! empty($data['search'])) {
            $query->where(fn ($query) => $query->where('code', 'like', '%'.$data['search'].'%')->orWhere('phone', 'like', '%'.$data['search'].'%')->orWhereHas('user', fn ($query) => $query->where('name', 'like', '%'.$data['search'].'%')));
        }

        return $this->page($request, $query->orderByDesc('created_at')->orderBy('id'), fn ($member) => $this->memberData($request, $member));
    }

    public function show(Request $request, string $id)
    {
        $this->context($request, true);
        $model = $this->model($request, 'Member');
        $input = $request->validate(['role' => 'sometimes|in:guru,peserta']);
        $member = $model::when(isset($input['role']), fn ($query) => $query->where('role', $input['role']))->findOrFail($id);

        return response()->json(['data' => $this->memberData($request, $member, true)]);
    }

    private function profileInput(Request $request, string $role): array
    {
        $rules = ['phone' => ['sometimes', 'nullable', 'string', 'max:20', 'regex:/^[+\d][\d\s-]{6,19}$/D'], 'gender' => 'sometimes|nullable|in:laki_laki,perempuan', 'address' => 'sometimes|nullable|string|max:1000'];
        foreach (['province', 'city', 'district', 'village'] as $part) {
            $rules[$part.'Id'] = 'sometimes|nullable|string|max:20';
            $rules[$part.'Name'] = 'sometimes|nullable|string|max:191';
        }
        if ($this->module($request) === 'tanwir') {
            $rules['teachingPlace'] = 'sometimes|nullable|string|max:191';
        }
        $data = $request->validate($rules);
        if ($this->module($request) === 'tanwir' && $role !== 'peserta') {
            $data['teachingPlace'] = null;
        }

        return $data;
    }

    private function credentials(Request $request, ?User $user = null, bool $create = false): array
    {
        $data = $request->validate(['name' => 'required|string|max:191', 'email' => ['sometimes', 'nullable', 'email', 'max:191', Rule::unique('users', 'email')->ignore($user?->id)], 'password' => ($create ? 'required' : 'sometimes|nullable').'|string|min:8|max:72']);
        if (! empty($data['email']) && str_ends_with(strtolower($data['email']), '.invalid')) {
            throw ValidationException::withMessages(['email' => 'Gunakan email yang aktif, atau kosongkan.']);
        }
        if (! empty($data['password']) && strlen($data['password']) > 72) {
            throw ValidationException::withMessages(['password' => 'Password terlalu panjang.']);
        }

        return $data;
    }

    public function store(Request $request)
    {
        $this->context($request, true);
        $role = $request->validate(['role' => 'required|in:guru,peserta'])['role'];
        $credentials = $this->credentials($request, null, true);
        $profile = $this->profileInput($request, $role);
        $groupId = $role === 'peserta' ? $request->input('groupId') : null;
        $groupModel = $this->model($request, 'Group');
        if ($groupId) {
            abort_unless($groupModel::whereKey($groupId)->exists(), 422, 'Kelompok tidak ditemukan.');
        }
        $member = DB::transaction(function () use ($request, $role, $credentials, $profile, $groupId) {
            $this->lockRegistry($request);
            $model = $this->model($request, 'Member');
            $base = $this->module($request) === 'tanwir' ? 'TQ' : 'OM';
            $prefix = ($role === 'guru' ? 'G' : 'P').$base;
            $sequence = $model::where('role', $role)->count();
            do {
                $code = $prefix.str_pad((string) ++$sequence, 3, '0', STR_PAD_LEFT);
            } while ($model::where('code', $code)->exists());
            $user = new User;
            $user->code = $code;
            $user->forceFill(['name' => $credentials['name'], 'email' => strtolower($credentials['email'] ?? $this->placeholder($request, $code)), 'password_hash' => Hash::make($credentials['password']), 'is_active' => $request->boolean('isActive'), 'is_superadmin' => false])->save();
            $member = new $model;
            $member->forceFill(['userId' => $user->id, 'code' => $code, 'role' => $role, 'groupId' => $groupId ?: null, ...$profile])->save();

            return $member;
        }, 5);
        if ($member->provinceName) {
            GeocodeLearningMember::dispatch($this->module($request), $member->id)->afterCommit();
        }

        return response()->json(['data' => ['id' => $member->id, 'code' => $member->code]], 201);
    }

    private function placeholder(Request $request, string $code): string
    {
        return strtolower($code).'@'.$this->module($request).'.sip.invalid';
    }

    public function update(Request $request, string $id)
    {
        $this->context($request, true);
        $model = $this->model($request, 'Member');
        $member = $model::findOrFail($id);
        $credentials = $this->credentials($request, $member->user);
        $profile = $this->profileInput($request, $member->role);
        $groupId = $member->role === 'peserta' ? $request->input('groupId') : null;
        $groupModel = $this->model($request, 'Group');
        if ($groupId) {
            abort_unless($groupModel::whereKey($groupId)->exists(), 422, 'Kelompok tidak ditemukan.');
        }
        DB::transaction(function () use ($request, $member, $credentials, $profile, $groupId): void {
            $this->lockRegistry($request);
            $user = $member->user;
            $user->forceFill(['name' => $credentials['name'], 'email' => strtolower($credentials['email'] ?? $this->placeholder($request, $member->code))]);
            if (! empty($credentials['password'])) {
                $user->password_hash = Hash::make($credentials['password']);
            }
            $user->save();
            // Core owns active-user safeguards and token revocation.
            app(UserService::class)->setActive($user->id, $request->boolean('isActive'));
            if (($profile['provinceId'] ?? null) !== $member->provinceId || ($profile['villageId'] ?? null) !== $member->villageId) {
                $profile += ['latitude' => null, 'longitude' => null];
            }
            $member->forceFill(['groupId' => $groupId ?: null, ...$profile])->save();
        }, 5);
        if ($member->provinceName && ($member->latitude === null || $member->longitude === null)) {
            GeocodeLearningMember::dispatch($this->module($request), $member->id)->afterCommit();
        }

        return response()->json(['ok' => true]);
    }

    public function status(Request $request, string $id)
    {
        $this->context($request, true);
        $input = $request->validate(['isActive' => 'required|boolean']);
        $model = $this->model($request, 'Member');
        $member = $model::findOrFail($id);
        app(UserService::class)->setActive($member->userId, $input['isActive']);

        return response()->json(['ok' => true]);
    }

    public function destroy(Request $request, string $id, LearningFileStore $files)
    {
        $this->context($request, true);
        $model = $this->model($request, 'Member');
        $member = $model::with('submissions')->findOrFail($id);
        $paths = [$member->photo, ...$member->submissions->pluck('file_path')->all()];
        DB::transaction(function () use ($member): void {
            $user = $member->user;
            $otherProfile = DB::table('tanwir_members')->where('user_id', $user->id)->where('id', '!=', $member->id)->exists()
                || DB::table('ojol_members')->where('user_id', $user->id)->where('id', '!=', $member->id)->exists()
                || DB::table('zakat_academy_profiles')->where('user_id', $user->id)->exists()
                || DB::table('teknisi_profiles')->where('user_id', $user->id)->exists();
            if ($user->is_superadmin || $otherProfile || DB::table('module_access')->where('user_id', $user->id)->exists()) {
                $member->delete();
            } else {
                $user->tokens()->delete();
                $user->delete();
            }
        }, 5);
        foreach ($paths as $path) {
            $files->delete($this->module($request), $path);
        }

        return response()->json(['ok' => true]);
    }

    public function profile(Request $request)
    {
        return response()->json(['data' => $this->memberData($request, $this->member($request), true)]);
    }

    public function updateProfile(Request $request, LearningFileStore $files)
    {
        $member = $this->member($request);
        $credentials = $this->credentials($request, $member->user);
        $profile = $this->profileInput($request, $member->role);
        $photo = null;
        $before = $member->photo;
        if ($request->hasFile('photo')) {
            $request->validate(['photo' => 'file|max:5120']);
            $detected = $files->detect($request->file('photo'));
            abort_unless($detected['kind'] === 'image', 422, 'Foto harus JPG, PNG, atau WEBP.');
            $photo = $files->save($this->module($request), 'photos/'.$member->id, $request->file('photo'), $detected['ext']);
        }
        try {
            DB::transaction(function () use ($request, $member, $credentials, $profile, $photo): void {
                $member->user->forceFill(['name' => $credentials['name'], 'email' => strtolower($credentials['email'] ?? $this->placeholder($request, $member->code))])->save();
                if (($profile['provinceId'] ?? null) !== $member->provinceId || ($profile['villageId'] ?? null) !== $member->villageId) {
                    $profile += ['latitude' => null, 'longitude' => null];
                }
                if ($photo) {
                    $profile['photo'] = $photo;
                }
                $member->forceFill($profile)->save();
            }, 5);
        } catch (\Throwable $error) {
            if ($photo) {
                $files->delete($this->module($request), $photo);
            } throw $error;
        }
        if ($photo) {
            $files->delete($this->module($request), $before);
        }
        if ($member->provinceName && ($member->latitude === null || $member->longitude === null)) {
            GeocodeLearningMember::dispatch($this->module($request), $member->id)->afterCommit();
        }

        return response()->json(['ok' => true]);
    }

    public function password(Request $request)
    {
        $member = $this->member($request);
        $data = $request->validate(['currentPassword' => 'required|string', 'password' => 'required|string|min:8|max:72', 'passwordConfirm' => 'required|same:password']);
        abort_unless(strlen($data['password']) <= 72 && Hash::check($data['currentPassword'], $member->user->password_hash), 422, 'Password lama salah atau password baru tidak valid.');
        $member->user->password_hash = Hash::make($data['password']);
        $member->user->save();

        return response()->json(['ok' => true]);
    }
}
