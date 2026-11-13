<?php
use App\Modules\Core\Models\User;
use App\Modules\Core\Models\Module;
use App\Modules\Academy\Models\ZakatAcademySetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
uses(RefreshDatabase::class);
beforeEach(function () {
    $admin = (new User)->forceFill(['name'=>'Admin','email'=>'settings@test.invalid','password_hash'=>bcrypt('test-password'),'is_active'=>true,'is_superadmin'=>true]);$admin->save();Sanctum::actingAs($admin);
    (new Module)->forceFill(['slug'=>'academy','name'=>'Academy','isActive'=>true])->save();
});
it('saves multiple named contacts without changing weights and saves weights without changing contacts', function () {
    $this->putJson('/api/v1/academy/admin/settings/learning',['daily_weight'=>35,'weekly_weight'=>30,'final_weight'=>35])->assertOk();
    $this->putJson('/api/v1/academy/admin/settings/learning',['csContacts'=>[['name'=>'CS Ikhwan','phone'=>'081234567890'],['name'=>'Admin Akhwat','phone'=>'+62 81234567891']]])->assertOk();
    $this->getJson('/api/v1/academy/settings/learning')->assertOk()->assertJsonPath('data.csPhone','6281234567890')->assertJsonPath('data.csContacts.1.name','Admin Akhwat')->assertJsonPath('data.csContacts.1.phone','6281234567891')->assertJsonPath('data.weights.DAILY',35);
    $this->putJson('/api/v1/academy/admin/settings/learning',['daily_weight'=>20,'weekly_weight'=>30,'final_weight'=>50])->assertOk();
    $this->getJson('/api/v1/academy/settings/learning')->assertJsonCount(2,'data.csContacts')->assertJsonPath('data.weights.FINAL',50);
    $this->putJson('/api/v1/academy/admin/settings/learning',['csPhone'=>'081234567892','daily_weight'=>35,'weekly_weight'=>30,'final_weight'=>35])->assertOk();
    $this->getJson('/api/v1/academy/settings/learning')->assertJsonPath('data.csContacts.0.phone','6281234567892')->assertJsonPath('data.csContacts.1.phone','6281234567891');
});
it('rejects invalid contacts and incomplete or invalid weights without saving partial changes', function () {
    foreach ([['csContacts'=>[]],['csContacts'=>[['name'=>'CS','phone'=>'bad']]],['csContacts'=>[['name'=>'CS','phone'=>'081234567890'],['name'=>'Other','phone'=>'+6281234567890']]],['daily_weight'=>20],['daily_weight'=>20,'weekly_weight'=>20,'final_weight'=>20,'csPhone'=>'081234567890']] as $payload) {
        $this->putJson('/api/v1/academy/admin/settings/learning',$payload)->assertUnprocessable();
    }
    expect(ZakatAcademySetting::count())->toBe(0);
});
it('supplies the primary contact for old settings and rejects non-admin updates', function () {
    $this->getJson('/api/v1/academy/settings/learning')->assertJsonPath('data.csContacts.0.phone','628111186626');
    $user=(new User)->forceFill(['name'=>'Student','email'=>'no-settings@test.invalid','password_hash'=>bcrypt('test-password'),'is_active'=>true]);$user->save();Sanctum::actingAs($user);
    $this->putJson('/api/v1/academy/admin/settings/learning',['daily_weight'=>35,'weekly_weight'=>30,'final_weight'=>35])->assertForbidden();
});
