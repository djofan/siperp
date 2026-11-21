import assert from "node:assert/strict";
import {readFileSync,existsSync} from "node:fs";
import {createRequire} from "node:module";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";
const native=createRequire(import.meta.url),ts=native("typescript");
function loader(overrides={}){
 const cache=new Map();
 function load(file){const full=path.resolve(file);if(cache.has(full))return cache.get(full);const exports={};cache.set(full,exports);
 const req=id=>{if(id in overrides)return overrides[id];if(id.startsWith('.')||id.startsWith('@/')){const base=id.startsWith('@/')?path.resolve(id.slice(2)):path.resolve(path.dirname(full),id);return load([base,base+'.ts',base+'.tsx'].find(existsSync));}return native(id);};
 vm.runInNewContext(ts.transpileModule(readFileSync(full,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:req,URLSearchParams});return exports;}
 return load;
}
const load=loader(),{bantuanRoles}=load('contracts/modules/bantuan.ts');
const {navigation,canViewRoute,processInfo}=load('modules/bantuan/policy.ts');
const {isWorkItem,queueCount}=load('modules/bantuan/workspace-guide.ts');
const {taskScope}=load('modules/bantuan/task-scope.ts');
const {applicationParams,defaultFilters}=load('modules/bantuan/list-filters.ts');
const dashboard={byStatus:Object.fromEntries(['draft','needs_data','screening','review1','bypass_review','survey_assignment','survey_assigned','survey_cc_review','survey_submitted','review2','approved','fund_ready','fund_submitted','fund_approved','disbursed','delivery_failed'].map(status=>[status,7])),taskCounts:{survey:{survey_assigned:2},distribution:{disbursed:3,delivery_failed:1}},santunanTasks:{transfer_pending:2,handover_pending:3}};

test('all role subsets and primary-role orders preserve actionable queues and matching list scopes',()=>{
 const roles=Object.keys(bantuanRoles);let cases=0;
 for(let mask=1;mask<2**roles.length;mask++){
  const selected=roles.filter((_,i)=>mask&(1<<i));
  for(const primary of selected){const viewer={role:primary,roles:[primary,...selected.filter(r=>r!==primary)],canBypass:false};
   const menus=navigation(viewer),work=menus.filter(item=>item.states?.length&&isWorkItem(viewer,item));
   assert.equal(new Set(menus.map(item=>item.key)).size,menus.length);
   const destinations=new Set();
   for(const item of work){assert.equal(canViewRoute(viewer,[item.key]),true,item.key);assert(queueCount(viewer,dashboard,item)>0,item.key);
    for(const state of item.states){const key=`${item.source??'applications'}:${state}`;assert(!destinations.has(key),`double counted ${primary} ${key}`);destinations.add(key);}
    if(item.source!=='santunan'){const params=applicationParams(viewer,item.key,defaultFilters);assert.equal(params.get('task')??undefined,taskScope(viewer,item.task));assert.equal(params.get('states'),item.states.join(','));assert.equal(item.task,processInfo(item.key).task);}
   }
   for(const [role,key] of [['requester','perlu-dilengkapi'],['call_center','review-survei-cc'],['approver','review-tahap-2'],['chair','review-ulang'],['survey_approver','review-tahap-1'],['verifier','survei'],['volunteer','penyaluran'],['treasurer','pencairan'],['fund_requester','dana-siap']]){
    if(selected.includes(role))assert(work.some(item=>item.key===key),`${selected} lost ${key}`);
   }
   cases++;
  }
 }
 assert.equal(cases,11264);
});

test('missing or invalid work counts never mean zero and santunan contributes to personal work',()=>{
 const viewer={role:'volunteer',canBypass:false},menu=navigation(viewer).find(item=>item.key==='penyaluran');
 assert.equal(queueCount(viewer,null,menu),null);
 assert.equal(queueCount(viewer,{byStatus:{}},menu),null);
 for(const invalid of [NaN,-1,'3',Infinity])assert.equal(queueCount(viewer,{...dashboard,taskCounts:{distribution:{disbursed:invalid}}},menu),null);
 const santunan=navigation(viewer).find(item=>item.key==='santunan');
 assert.equal(isWorkItem(viewer,santunan),true);assert.equal(queueCount(viewer,dashboard,santunan),5);
 assert.equal(queueCount(viewer,{...dashboard,santunanTasks:undefined},santunan),null);
 assert.equal(queueCount(viewer,{...dashboard,taskCounts:{distribution:{}}},menu),0);
});

test('work and notification refreshes are independent, recover from failure and surface new counts',async()=>{
 let fail='',count=0;
 const read=loader({'./client':{request:async name=>{if(name===fail)throw new Error('offline');return name==='dashboard'?{...dashboard,total:count}:[];}}})('modules/bantuan/api/work-signals.ts').readWorkSignals;
 const signal=new AbortController().signal;
 assert.equal((await read(signal)).dashboard.total,0);count=2;
 assert.equal((await read(signal)).dashboard.total,2);
 fail='dashboard';const failed=await read(signal);assert.equal(failed.failed,true);assert.equal(failed.dashboard,null);assert.equal(failed.notifications.length,0);
 fail='notifications';const partial=await read(signal);assert.equal(partial.failed,false);assert.equal(partial.dashboard.total,2);assert.equal(partial.notifications,null);
 fail='';assert.equal((await read(signal)).failed,false);
});
