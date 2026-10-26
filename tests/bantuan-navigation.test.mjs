import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";

const require=createRequire(import.meta.url);
const ts=require("typescript");
const source=readFileSync("modules/bantuan/policy.ts","utf8");
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const sandbox={exports:{}};
vm.runInNewContext(compiled,sandbox);
const {navigation,sidebarNavigation,canViewRoute,defaultListStates,processMenus,processInfo}=sandbox.exports;
const roles=["admin","call_center","approver","chair","verifier","fund_requester","treasurer"];

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
    assert.ok(sidebar.length<=7,role);
    assert.ok(sidebar.some(item=>item.key==="proses"),role);
    assert.equal(canViewRoute(viewer,["proses"]),true);
    for(const item of sidebar)assert.equal(canViewRoute(viewer,item.key?[item.key]:[]),true);
    for(const item of navigation(viewer).filter(item=>item.states?.length))assert.equal(canViewRoute(viewer,[item.key]),true);
    assert.equal(sidebar.some(item=>item.states?.length),false);
  }
});
