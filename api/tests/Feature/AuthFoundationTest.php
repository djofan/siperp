<?php

use App\Modules\Core\Auth\TokenIssuer;
use App\Modules\Core\Models\User;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;

it('recognizes a real Bearer token and rejects it at the absolute seven-day deadline', function () {
    withNextAuthFixture(function (array $fixture, User $user): void {
        $this->travelTo(now()->startOfSecond());
        $issuedAt = now()->copy();
        $token = app(TokenIssuer::class)->issue($user);
        expect($token->accessToken->id)->toMatch('/^c[a-z0-9]{24}$/D');
        expect($token->accessToken->expires_at->equalTo($issuedAt->copy()->addDays(7)))->toBeTrue();
        expect($token->accessToken->token)->toBe(hash('sha256', explode('|', $token->plainTextToken, 2)[1]));
        Route::get('/api/v1/test-auth', fn () => JsonResource::make(['id' => request()->user()->getAuthIdentifier()]))->middleware('api', 'auth:sanctum');
        try {
            $this->withToken($token->plainTextToken)->getJson('/api/v1/test-auth')->assertOk()->assertJsonPath('data.id', $fixture['id']);
            Auth::forgetGuards();
            $this->travelTo($issuedAt->copy()->addDays(7)->subSecond());
            $this->withToken($token->plainTextToken)->getJson('/api/v1/test-auth')->assertOk();
            Auth::forgetGuards();
            $this->travelTo($issuedAt->copy()->addDays(7));
            $this->withToken($token->plainTextToken)->getJson('/api/v1/test-auth')->assertUnauthorized()->assertJsonPath('error.code', 'unauthenticated');
        } finally {
            $this->travelBack();
        }
    });
});

it('verifies the Next-created account in Laravel and the Laravel hash through Next login', function () {
    withNextAuthFixture(function (array $fixture, User $user): void {
        expect($fixture['hash'])->toStartWith('$2b$12$');
        expect($user->getAuthPasswordName())->toBe('password_hash');
        expect($user->getAuthPassword())->toBe($fixture['hash']);
        expect(Hash::check($fixture['password'], $user->getAuthPassword()))->toBeTrue();
        expect(Hash::check('incorrect-password', $user->getAuthPassword()))->toBeFalse();
        expect(config('hashing.rehash_on_login'))->toBeFalse();
        expect(config('hashing.bcrypt.verify'))->toBeFalse();
        $hash = Hash::make($fixture['password']);
        expect($hash)->toStartWith('$2y$12$');
        DB::table('users')->where('id', $user->id)->update(['password_hash' => $hash]);
        $result = nextAuthFixture(['operation' => 'verify', 'id' => $fixture['id'], 'password' => $fixture['password']]);
        expect($result['prefix'])->toBe('$2y$');
        expect($result['verified'])->toBeTrue();
    });
});

it('generates Laravel user IDs compatible with Prisma CUID v1', function () {
    DB::beginTransaction();
    try {
        $user = new User;
        $user->forceFill(['name' => 'CUID test', 'email' => 'cuid-'.bin2hex(random_bytes(8)).'@example.test', 'password_hash' => Hash::make('cuid-test-only')]);
        $user->save();
        expect($user->id)->toMatch('/^c[a-z0-9]{24}$/D');
        expect($user->getIncrementing())->toBeFalse();
        expect($user->getKeyType())->toBe('string');
    } finally {
        DB::rollBack();
    }
});
