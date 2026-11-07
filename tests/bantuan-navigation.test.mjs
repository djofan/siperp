import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require=createRequire(import.meta.url);
const ts=require("typescript");
const source=readFileSync("modules/bantuan/policy.ts","utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const loadSource=(file,imports={})=>{const context={exports:{},require:id=>imports[id]};vm.runInNewContext(ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText,context);return context.exports;};
const contracts=loadSource("contracts/modules/bantuan.ts");
const permissions=loadSource("modules/bantuan/permissions.ts",{"@/contracts/modules/bantuan":contracts});
const sandbox={exports:{},require:id=>id==="./permissions"?permissions:null};
vm.runInNewContext(compiled,sandbox);
const {navigation,sidebarNavigation,canViewRoute,defaultListStates,processMenus,processInfo}=sandbox.exports;
const roles=["admin","requester","call_center","approver","chair","verifier","fund_requester","treasurer"];

test("mustahiq navigation uses the role union and denies field-only accounts",()=>{
  for(const roles of [["verifier"],["volunteer"],["verifier","volunteer"],["verifier","call_center"],["volunteer","treasurer"],["admin"],["requester"]]){
    const viewer={role:roles[0],roles,canBypass:false};
    const allowed=roles.some(role=>!["verifier","volunteer"].includes(role));
    assert.equal(navigation(viewer).some(item=>item.key==="mustahiq"),allowed);
    assert.equal(canViewRoute(viewer,["mustahiq"]),allowed);
    assert.equal(canViewRoute(viewer,["mustahiq","person-id"]),allowed);
    assert.equal(canViewRoute(viewer,["mustahiq","person-id","arbitrary"]),false);
  }
});

test("every displayed Bantuan navigation link is accepted by the server policy",()=>{
  for(const role of roles){
    for(const canBypass of [false,true]){
      const viewer={role,canBypass};
      for(const item of navigation(viewer))assert.equal(canViewRoute(viewer,item.key?item.key.split("/"):[]),true,role+": "+item.key);
    }
  }
});
test("verifier can open assigned applications and the handover queue without admin access",()=>{
  const viewer={role:"verifier",canBypass:false};
  assert.equal(canViewRoute(viewer,["pengajuan"]),true);
  assert.equal(canViewRoute(viewer,["penyaluran"]),true);
  assert.equal(canViewRoute(viewer,["pengajuan","example"]),true);
  for(const route of ["tim","pengaturan","audit","dana","pencairan"])
    assert.equal(canViewRoute(viewer,[route]),false,route);
  assert.equal(Array.from(defaultListStates(viewer,"penyaluran")).join(","),"disbursed");
  assert.equal(defaultListStates(viewer,"pengajuan").length,0);
});
test("fund queue keeps submitted applications visible for manual approval",()=>{
  assert.equal(Array.from(defaultListStates({role:"fund_requester"},"dana")).join(","),"fund_ready,fund_submitted");
});

test("every workflow status has a specific menu with a matching queue filter",()=>{
  const statuses=["draft","screening","needs_data","review1","bypass_review","survey_assignment","survey_assigned","survey_submitted","review2","approved","fund_ready","fund_submitted","fund_approved","disbursed","delivery_failed","completed","returned","cancelled","rejected_screening","rejected_t1","rejected_t2","rejected_bypass"];
  const covered=new Set(processMenus.flatMap(menu=>Array.from(menu.states)));
  for(const status of statuses)assert.equal(covered.has(status),true,status);
  for(const menu of processMenus){
    assert.ok(menu.description.length>20,menu.key);
    assert.deepEqual(Array.from(defaultListStates({role:"admin"},menu.key)),Array.from(menu.states));
  }
});

test("operational accounts see each of their process queues without management access",()=>{
  const expected={
    requester:["draft","perlu-dilengkapi"],
    call_center:["draft","screening","perlu-dilengkapi","penugasan-survei","penugasan-penyalur"],
    approver:["review-tahap-1","review-tahap-2","review-ulang","review-langsung"],
    verifier:["survei","penyaluran","gagal-salur","selesai"],
    fund_requester:["dana-siap","dana-diajukan","pencairan"],
    treasurer:["pencairan","penyaluran","gagal-salur","dana-kembali"],
  };
  for(const [role,keys] of Object.entries(expected)){
    const viewer={role,canBypass:false},menus=navigation(viewer);
    for(const key of keys)assert.ok(menus.some(menu=>menu.key===key),role+": "+key);
    for(const key of ["tim","pengaturan"])assert.equal(canViewRoute(viewer,[key]),false);
  }
  assert.equal(processInfo("survei").task,"survey");
  assert.equal(processInfo("penyaluran").task,"distribution");
  assert.equal(canViewRoute({role:"verifier",canBypass:false},["pengajuan","langsung"]),false);
  assert.equal(canViewRoute({role:"verifier",canBypass:true},["pengajuan","langsung"]),true);
});

test("sidebar stays compact while the process launcher retains every authorized queue",()=>{
  for(const role of roles){
    const viewer={role,canBypass:true},sidebar=sidebarNavigation(viewer);
    assert.ok(sidebar.length<=11,role);
    assert.ok(sidebar.length>=3,role);
    assert.ok(sidebar.some(item=>item.key==="proses"),role);
    assert.equal(canViewRoute(viewer,["proses"]),true);
    for(const item of sidebar)assert.equal(canViewRoute(viewer,item.key?[item.key]:[]),true);
    for(const item of navigation(viewer).filter(item=>item.states?.length))assert.equal(canViewRoute(viewer,[item.key]),true);
    if(role!=="admin")assert.ok(sidebar.some(item=>item.states?.length),role);
  }
});

test("staff can create and follow their own applications without review fund or management menus",()=>{
  const viewer={role:"requester",canBypass:true};
  assert.equal(canViewRoute(viewer,["pengajuan","baru"]),true);
  assert.equal(canViewRoute(viewer,["pengajuan","example","edit"]),true);
  assert.ok(navigation(viewer).some(item=>item.key==="pengajuan"&&item.label==="Pengajuan saya"));
  for(const route of [["pengajuan","langsung"],["screening"],["review-tahap-1"],["penugasan-survei"],["dana"],["pencairan"],["tim"],["audit"]])
    assert.equal(canViewRoute(viewer,route),false,route.join("/"));
});

test("the intake preview follows the original role rather than the WhatsApp or walk in source",()=>{
  const {intakeStage}=sandbox.exports;
  for(const source of ["online","walk_in"]){
    assert.equal(intakeStage(source,"requester"),"review1");
    assert.equal(intakeStage(source,"call_center"),"review1");
  }
  assert.equal(intakeStage("bypass","verifier"),"bypass_review");
});

test("ongoing applications are visible to operational roles but not field-only accounts",()=>{
  for(const role of ["admin","call_center","requester","fund_requester","treasurer","approver","chair"]){
    assert.equal(canViewRoute({role,canBypass:false},["berjalan"]),true);
  }
  for(const role of ["verifier","volunteer"]){
    assert.equal(canViewRoute({role,canBypass:false},["berjalan"]),false);
  }
});


test("sidebar omits unrelated general menus and unions all assigned roles",()=>{
  const personal=["requester","verifier"];
  for(const role of personal){
    const viewer={role,canBypass:false};const keys=sidebarNavigation(viewer).map(item=>item.key);
    for(const key of ["berjalan","mustahiq","pengajuan-dana","laporan","santunan","tim","audit","pengaturan"])assert.equal(keys.includes(key),false,role+": "+key);
    assert.equal(sidebarNavigation(viewer).find(item=>item.key==="pengajuan").label,"Pengajuan saya");
  }
  assert.deepEqual(Array.from(sidebarNavigation({role:"volunteer",canBypass:false}),item=>item.key),["santunan"]);
  const multi={role:"requester",roles:["requester","verifier","volunteer","treasurer"],canBypass:false};
  const keys=sidebarNavigation(multi).map(item=>item.key);
  for(const key of ["proses","berjalan","pengajuan-dana","laporan","santunan","pencairan","survei"])assert.ok(keys.includes(key),key);
  assert.equal(new Set(keys).size,keys.length);
  assert.equal(sidebarNavigation(multi).find(item=>item.key==="pengajuan").label,"Semua pengajuan");
  for(const key of ["tim","pengaturan","audit"])assert.equal(keys.includes(key),false,key);
});
