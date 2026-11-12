<?php
use App\Modules\Core\Models\User;
use App\Modules\Lazsip\Services\CampaignService;
use App\Modules\Lazsip\Models\LazsipCampaign;
use App\Modules\Payment\Models\PaymentTransaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\{DB,Http,Hash};
use Illuminate\Support\Str;
uses(RefreshDatabase::class);
beforeEach(function(){
 Http::preventStrayRequests();
 DB::table('modules')->insert(['id'=>'test-lazsip','slug'=>'lazsip','name'=>'LAZSIP','is_active'=>true]);
 $this->admin=new User;$this->admin->forceFill(['name'=>'Admin','password_hash'=>Hash::make('test-password-long'),'is_active'=>true,'is_superadmin'=>false])->save();
 DB::table('module_access')->insert(['id'=>Str::uuid(),'user_id'=>$this->admin->id,'module_id'=>'test-lazsip','role'=>'admin']);
 DB::table('payment_donors')->insert(['id'=>'test-donor','name'=>'Test']);
 DB::table('payment_destination_accounts')->insert(['id'=>'test-account','module_source'=>'lazsip','fund_type'=>'infak','bank_name'=>'Test','account_number'=>'123','account_name'=>'Test']);
 $this->campaign=new LazsipCampaign;$this->campaign->forceFill(['id'=>'test-campaign','title'=>'Uji','description'=>'Uji','targetAmount'=>0,'currentAmount'=>0,'uniqueCode'=>'91','isPinned'=>false,'status'=>'active'])->save();
 $this->row=new PaymentTransaction;$this->row->forceFill(['id'=>'test-payment','trackingCode'=>'LZS-TEST01','moduleSource'=>'lazsip','sourceType'=>'campaign','sourceId'=>'test-campaign','fundType'=>'infak','donorId'=>'test-donor','destinationAccountId'=>'test-account','amount'=>100000,'paymentMethod'=>'iPaymu','gateway'=>'ipaymu','gatewayState'=>'settled','status'=>'paid'])->save();
 $this->url='/api/v1/lazsip/admin/transactions/payment/test-payment';$this->payload=['confirmationCode'=>'LZS-TEST01','testTransaction'=>true];
});
it('allows module admin to delete a confirmed production test and recalculates campaign totals',function(){
 DB::table('payment_receipts')->insert(['id'=>'receipt-test','transaction_id'=>'test-payment','recipient'=>'test@example.test','subject'=>'Test','html'=>'Test','text'=>'Test','status'=>'pending']);
 DB::table('payment_idempotency')->insert(['scope'=>'test-scope','key_hash'=>'test-key','fingerprint'=>'test-fingerprint','transaction_id'=>'test-payment','created_at'=>now(),'updated_at'=>now()]);
 expect(app(CampaignService::class)->representation($this->campaign)['currentAmount'])->toBe(100000);
 $this->actingAs($this->admin,'sanctum')->deleteJson($this->url,$this->payload)->assertOk();
 $this->assertDatabaseMissing('payment_transactions',['id'=>'test-payment']);$this->assertDatabaseMissing('payment_receipts',['transaction_id'=>'test-payment']);
 $this->assertDatabaseHas('payment_donors',['id'=>'test-donor']);$this->assertDatabaseHas('payment_idempotency',['transaction_id'=>'test-payment']);
 expect(app(CampaignService::class)->representation($this->campaign)['currentAmount'])->toBe(0);
 Http::assertNothingSent();
});
it('requires administrator role and exact test confirmation',function(){
 $this->deleteJson($this->url,$this->payload)->assertUnauthorized();
 $this->actingAs($this->admin,'sanctum')->deleteJson($this->url,['confirmationCode'=>'WRONG','testTransaction'=>true])->assertUnprocessable();
 $this->deleteJson($this->url,['confirmationCode'=>'LZS-TEST01','testTransaction'=>false])->assertUnprocessable();
 DB::table('module_access')->where('user_id',$this->admin->id)->update(['role'=>'viewer']);
 $this->deleteJson($this->url,$this->payload)->assertForbidden();
 $this->assertDatabaseHas('payment_transactions',['id'=>'test-payment']);
});
it('blocks deletion of another module and active gateway work',function(){
 $this->row->forceFill(['gatewayState'=>'creating'])->save();
 $this->actingAs($this->admin,'sanctum')->deleteJson($this->url,$this->payload)->assertStatus(409);
 $this->row->forceFill(['gatewayState'=>'settled','moduleSource'=>'sarsip'])->save();
 $this->deleteJson($this->url,$this->payload)->assertNotFound();
});
it('allows superadmin and deletes legacy donations and zakat with explicit confirmation',function(){
 $this->admin->forceFill(['is_superadmin'=>true])->save();
 foreach(['legacy-donation'=>'lazsip_donations','zakat'=>'lazsip_zakat_payments'] as $source=>$table){
  $values=['id'=>'legacy-'.$source,'donor_id'=>'test-donor','amount'=>50000,'payment_method'=>'Manual','status'=>'paid'];
  if($source==='legacy-donation')$values['campaign_id']='test-campaign';
  DB::table($table)->insert($values);
  $this->actingAs($this->admin,'sanctum')->deleteJson('/api/v1/lazsip/admin/transactions/'.$source.'/'.$values['id'],['confirmationCode'=>$values['id'],'testTransaction'=>true])->assertOk();
  $this->assertDatabaseMissing($table,['id'=>$values['id']]);
 }
});

it('blocks reconciled payments and removes unused zakat details after test deletion',function(){
 DB::table('core_bank_lines')->insert(['id'=>'matched-line','account_id'=>'test-account','booked_at'=>now(),'reference'=>'TEST','description'=>'Test','direction'=>'masuk','amount'=>100000,'fingerprint'=>'test-line','payment_id'=>'test-payment']);
 $this->actingAs($this->admin,'sanctum')->deleteJson($this->url,$this->payload)->assertStatus(409);
 DB::table('core_bank_lines')->where('id','matched-line')->delete();
 DB::table('lazsip_zakat_details')->insert(['id'=>'zakat-detail','zakat_type'=>'maal']);
 $this->row->forceFill(['sourceType'=>'zakat','sourceId'=>'zakat-detail','fundType'=>'zakat'])->save();
 $this->deleteJson($this->url,$this->payload)->assertOk();
 $this->assertDatabaseMissing('lazsip_zakat_details',['id'=>'zakat-detail']);
});
