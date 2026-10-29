import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const exports = {};
vm.runInNewContext(ts.transpileModule(read('modules/teknisi/api/policy.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, { exports, FormData });

test('frontend transitions match Laravel TeknisiContext exactly', () => {
  const source = read('api/app/Modules/Teknisi/Services/TeknisiContext.php').split('public const TRANSITIONS = [')[1].split('public function actor')[0];
  const transitions = [...source.matchAll(/'([a-z_]+)'\s*=>\s*\[([^\]]*)\]/g)];
  assert.equal(transitions.length, 8);
  for (const [, status, targets] of transitions) {
    const expected = [...targets.matchAll(/'([a-z_]+)'/g)].map(match => match[1]);
    assert.deepEqual(Array.from(exports.nextStatuses(status)), expected);
    assert.ok(exports.isStatus(status));
  }
  assert.equal(exports.canTransition('received', 'repairing'), false);
  assert.equal(exports.canTransition('received', 'diagnosis'), true);
  assert.equal(exports.canTransition('ready', 'collected'), true);
  assert.equal(exports.canTransition('collected', 'repairing'), false);
});

test('stage forms forward concurrency guards and use the explicit workflow endpoint', () => {
  const form = read('modules/teknisi/components/operations/workflow-form.tsx');
  assert.match(form, /name="expectedStatus" value=\{ticket.status\}/);
  assert.match(form, /name="expectedVersion" value=\{ticket.updatedAt.toISOString\(\)\}/);
  assert.match(form, /operation === "complete"/);
  assert.match(form, /operation === "collect"/);
  assert.doesNotMatch(form, /Choice name="status"/);
  assert.match(form, /confirmMessage=/);
  const actions = read('modules/teknisi/api/workflow-actions.ts');
  assert.match(actions, /requireTechnicianUser/);
  assert.match(actions, /apiRequest\("teknisi\/workflow"/);
  assert.match(actions, /if \(!user.canWrite\)/);
  assert.match(actions, /destinations\[operation\]/);
});

test('navigation targets real pages and financial totals come from Laravel', () => {
  for (const path of ['app/admin/teknisi/outlet/baru/page.tsx','app/admin/teknisi/teknisi/baru/page.tsx','app/admin/teknisi/laporan/page.tsx','app/(public)/teknisi/panel/laporan/page.tsx','app/admin/teknisi/tiket/[id]/[operation]/page.tsx','app/(public)/teknisi/panel/tiket/[id]/[operation]/page.tsx']) assert.ok(existsSync(new URL(`../${path}`, import.meta.url)), path);
  const dashboard = read('modules/teknisi/components/operations/dashboard.tsx');
  assert.match(dashboard, /monitoring\(user,filters.outlet\)/);
  assert.doesNotMatch(dashboard, /prisma|paidAmount|capitalCost|Math.random/);
  assert.doesNotMatch(read('modules/teknisi/components/RecentActivity.tsx'), /Pembayaran diterima/);
  assert.match(read('modules/teknisi/pages/operator/layout.tsx'), /row.id===user.technician.outletId/);
  assert.match(read('modules/teknisi/components/operations/finance-summary.tsx'), /teknisi\/service-finance/);
});

test('workflow actions are stage-specific and warranty keeps the completed ticket intact', () => {
  const workflow = {};
  vm.runInNewContext(ts.transpileModule(read('modules/teknisi/api/workflow.ts'), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText, {exports:workflow});
  assert.equal(workflow.stageOperation('received').operation,'start');
  assert.equal(workflow.stageOperation('repairing').operation,'complete');
  assert.equal(workflow.stageOperation('ready').operation,'collect');
  assert.equal(workflow.stageOperation('collected'),null);
  assert.equal(workflow.activeWarranty({status:'collected',workflow:{warrantyUntil:new Date(Date.now()+86400000)}}),true);
  assert.equal(workflow.activeWarranty({status:'collected',workflow:{warrantyUntil:new Date(0)}}),false);
});

test('forms retain drafts after validation errors and stage filters survive refresh', () => {
  const form=read('modules/teknisi/components/ActionForm.tsx');
  assert.match(form,/sessionStorage.setItem/);
  assert.match(form,/snapshot.current/);
  assert.match(form,/new DataTransfer/);
  const list=read('modules/teknisi/components/operations/tickets.tsx');
  assert.match(list,/type="hidden" name="status" value=\{filters.status\}/);
  assert.match(list,/!filters.status\|\|filters.status==="received"/);
});

test('successful mutations navigate without rerendering an obsolete stage', async () => {
  const source=read('modules/teknisi/api/workflow-actions.ts');
  assert.doesNotMatch(source,/revalidatePath\(/);
  const actionExports={};
  vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{
    exports:actionExports,
    require(name){
      if(name==='@/lib/api')return {apiRequest:async(_path,init)=>{assert.equal(init.body.has('paymentProof'),false);return true;},ApiError:class ApiError extends Error{}};
      if(name==='./access')return {requireTechnicianUser:async()=>({role:'technician',canWrite:true})};
      if(name==='./navigation')return {operationalRoot:()=>'/teknisi/panel'};
      throw new Error('Unexpected module '+name);
    },
    FormData,
  });
  for(const [operation,status] of [['start','repairing'],['complete','ready'],['collect','collected']]){
    const data=new FormData();data.set('operation',operation);data.set('paymentProof',new File([],''));
    const result=await actionExports.advanceService({},data);
    assert.equal(result.redirectTo,'/teknisi/panel/tiket?status='+status);
  }
  const form=read('modules/teknisi/components/operations/workflow-form.tsx');
  assert.match(form,/redirect\(/);
  assert.match(read('modules/teknisi/components/ActionForm.tsx'),/router.replace\(state.redirectTo\)/);
});

test('sidebar stays on the current stage while forms and details are open',()=>{
  const workflow={};
  vm.runInNewContext(ts.transpileModule(read('modules/teknisi/api/workflow.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:workflow});
  const root='/teknisi/panel';
  for(const [operation,status] of [['start','received'],['complete','repairing'],['collect','ready']]){
    assert.equal(workflow.selectedServiceMenu(root+'/tiket/test/'+operation,root,null),status);
  }
  assert.equal(workflow.selectedServiceMenu(root+'/tiket/test',root,'repairing'),'repairing');
  assert.equal(workflow.selectedServiceMenu(root+'/tiket',root,null),null);
});

test('landing tracking uses an in-page dialog and the public API', () => {
  const popup=read('modules/teknisi/components/TrackingPopup.tsx');
  for(const path of ['modules/teknisi/pages/page.tsx','modules/teknisi/pages/site-layout.tsx']){
    assert.match(read(path),/<TrackingPopup/);
    assert.doesNotMatch(read(path),/href="\/teknisi\/cek-status"/);
  }
  assert.match(popup,/showModal\(/);
  assert.match(popup,/\/api\/teknisi\/tracking\//);
  assert.match(popup,/credentials:"omit"/);
  assert.match(popup,/referrerPolicy:"no-referrer"/);
  assert.match(popup,/AbortController/);
  assert.match(popup,/role="alert"/);
  assert.doesNotMatch(popup,/router\.(push|replace)|window.location/);
});

test('frontend validation still bounds amounts and protects CSV cells', () => {
  for (const value of ['-1','1.5','','1000000001']) { const data = new FormData(); data.set('amount',value); assert.throws(() => exports.integer(data,'amount')); }
  for (const value of ['=1','  +1','@SUM(A1)','-1']) assert.ok(exports.csvCell(value).startsWith('"\''));
});
