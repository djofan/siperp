<?php

namespace App\Modules\Lazsip\Http\Controllers;

use App\Modules\Core\Auth\TokenIssuer;
use App\Modules\Core\Models\User;
use App\Modules\Lazsip\Http\Requests\AffiliateLoginRequest;
use App\Modules\Lazsip\Http\Requests\AffiliateProfileRequest;
use App\Modules\Lazsip\Http\Requests\AffiliateRegistrationRequest;
use App\Modules\Lazsip\Http\Resources\AffiliateReferralResource;
use App\Modules\Lazsip\Http\Resources\AffiliateResource;
use App\Modules\Lazsip\Models\Affiliate;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AffiliateController
{
    private function own(Request $request): Affiliate
    {
        $affiliate = Affiliate::with('user')->where('user_id', $request->user()->id)->first();
        abort_unless($affiliate && $affiliate->is_active, 403, 'Keanggotaan affiliator tidak tersedia atau sedang dinonaktifkan.');

        return $affiliate;
    }

    private function response(Affiliate $affiliate, string $token, bool $remember = false, int $status = 200)
    {
        $minutes = $remember ? config('frontend.remembered_session_minutes') : 0;
        $response = (new AffiliateResource($affiliate->load('user')))->response()->setStatusCode($status)
            ->header('Cache-Control', 'no-store, private')
            ->withCookie(cookie('sip_session', $token, $minutes, '/', null, config('frontend.secure_cookie'), true, false, 'lax'));
        if ($status === 201) {
            $response->header('Location', url('/api/v1/lazsip/affiliate/me'));
        }

        return $response;
    }

    public function register(AffiliateRegistrationRequest $request, TokenIssuer $issuer)
    {
        $data = $request->validated();
        try {
            [$affiliate, $token] = DB::transaction(function () use ($data, $issuer) {
                $user = new User;
                $user->name = $data['name'];
                $user->email = $data['email'];
                $user->password_hash = Hash::make($data['password']);
                $user->is_active = true;
                $user->is_superadmin = false;
                $user->save();
                $affiliate = new Affiliate;
                $affiliate->user_id = $user->id;
                $affiliate->phone = $data['phone'];
                $affiliate->is_active = true;
                $affiliate->save();
                // Deliberately no module_access row: LAZSIP's operational/admin APIs stay closed.
                $token = $issuer->issue($user, 'next-server', now()->addMinutes(config('frontend.browser_session_token_minutes')));

                return [$affiliate, $token->plainTextToken];
            }, 3);
        } catch (UniqueConstraintViolationException $error) {
            throw ValidationException::withMessages(['email' => 'Akun sudah terdaftar. Silakan masuk menggunakan email Anda.']);
        }

        return $this->response($affiliate, $token, false, 201);
    }

    public function login(AffiliateLoginRequest $request, TokenIssuer $issuer)
    {
        $email = $request->validated('email');
        $user = User::whereRaw('LOWER(email) = ?', [$email])->first();
        abort_unless($user && $user->is_active && Hash::check($request->validated('password'), $user->password_hash), 401, 'Email atau password salah.');
        $remember = $request->boolean('remember');
        [$affiliate, $token] = DB::transaction(function () use ($user, $email, $issuer, $remember) {
            // Serialize enrollment of an existing ERP account. Login never restores suspended membership.
            $locked = User::whereKey($user->id)->lockForUpdate()->firstOrFail();
            abort_unless(strtolower($locked->email) === $email && $locked->is_active && hash_equals($user->password_hash, $locked->password_hash), 401, 'Email atau password salah.');
            $affiliate = Affiliate::where('user_id', $locked->id)->first();
            if (! $affiliate) {
                $affiliate = new Affiliate;
                $affiliate->user_id = $locked->id;
                $affiliate->is_active = true;
                $affiliate->save();
            }
            abort_unless($affiliate->is_active, 403, 'Keanggotaan affiliator sedang dinonaktifkan.');
            $minutes = $remember ? config('frontend.remembered_session_minutes') : config('frontend.browser_session_token_minutes');

            return [$affiliate, $issuer->issue($locked, 'next-server', now()->addMinutes($minutes))->plainTextToken];
        }, 3);

        return $this->response($affiliate, $token, $remember);
    }

    public function referral(string $code)
    {
        $affiliate = Affiliate::where('referral_code', $code)->where('is_active', true)
            ->whereHas('user', fn ($query) => $query->where('is_active', true))->firstOrFail();

        return (new AffiliateReferralResource($affiliate))->response()->header('Cache-Control', 'no-store, private');
    }

    public function show(Request $request)
    {
        return (new AffiliateResource($this->own($request)))->response()->header('Cache-Control', 'no-store, private');
    }

    public function update(AffiliateProfileRequest $request)
    {
        $data = $request->validated();
        try {
            $affiliate = DB::transaction(function () use ($request, $data) {
                $user = User::whereKey($request->user()->id)->lockForUpdate()->firstOrFail();
                $affiliate = $this->own($request);
                $user->name = $data['name'];
                $user->email = $data['email'];
                $user->save();
                $affiliate->phone = $data['phone'];
                $affiliate->save();

                return $affiliate->setRelation('user', $user);
            }, 3);
        } catch (UniqueConstraintViolationException $error) {
            throw ValidationException::withMessages(['email' => 'Email sudah digunakan akun lain.']);
        }

        return (new AffiliateResource($affiliate))->response()->header('Cache-Control', 'no-store, private');
    }
}
