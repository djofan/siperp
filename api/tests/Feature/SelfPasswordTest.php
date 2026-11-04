<?php
use App\Modules\Core\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;

uses(RefreshDatabase::class);

it('lets an operational account change only its own password and revokes other sessions', function () {
    $user=new User;
    $user->forceFill(['name'=>'Petugas','password_hash'=>Hash::make('old-password-123'),'is_active'=>true,'is_superadmin'=>false])->save();
    $current=$user->createToken('current');
    $other=$user->createToken('other');
    $this->withToken($current->plainTextToken);
    $url='/api/v1/auth/password';
    $this->putJson($url,['current_password'=>'wrong','password'=>'new-password-123','password_confirmation'=>'new-password-123'])->assertUnprocessable();
    $this->putJson($url,['current_password'=>'old-password-123','password'=>'new-password-123','password_confirmation'=>'different'])->assertUnprocessable();
    expect(Hash::check('old-password-123',$user->fresh()->password_hash))->toBeTrue();
    $this->putJson($url,['current_password'=>'old-password-123','password'=>'new-password-123','password_confirmation'=>'new-password-123'])->assertOk();
    expect(Hash::check('new-password-123',$user->fresh()->password_hash))->toBeTrue();
    $this->assertDatabaseHas('personal_access_tokens',['id'=>$current->accessToken->id]);
    $this->assertDatabaseMissing('personal_access_tokens',['id'=>$other->accessToken->id]);
});

it('requires authentication to change a password', function () {
    $this->putJson('/api/v1/auth/password',[])->assertUnauthorized();
});
