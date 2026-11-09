import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import {readFileSync} from "node:fs";

function worker({context={enabled:true,registered:true,binding:"current"},status=200,clients=[]}={}){
  const listeners={},shown=[],requests=[],opened=[];
  const self={location:{origin:"https://example.test"},registration:{showNotification:async(title,options)=>shown.push({title,options})},clients:{matchAll:async()=>clients,openWindow:async url=>opened.push(url),claim:async()=>{}},addEventListener:(name,fn)=>(listeners[name]??=[]).push(fn),skipWaiting:()=>{}};
  vm.runInNewContext(readFileSync("public/bantuan-app/sw.js","utf8"),{self,URL,Response,caches:{},fetch:async(url,options)=>{requests.push({url,options});return new Response(JSON.stringify({data:context}),{status});}});
  async function dispatch(name,event){for(const fn of listeners[name]??[])fn(event);if(event.pending)await event.pending;}
  return {dispatch,shown,requests,opened};
}
function push(data){return {data:{json:()=>({data})},waitUntil(promise){this.pending=promise;}};}
const payload={type:"bantuan_pwa",binding:"current",notification_id:"example-id",privateText:"Do not display private beneficiary details",url:"https://untrusted.example"};

test("PWA push validates the current cookie session and displays only generic content",async()=>{
  const delivered=[];const app={url:"https://example.test/bantuan-app/beranda",postMessage:value=>delivered.push(value)};
  const w=worker({clients:[app]});await w.dispatch("push",push(payload));
  assert.equal(w.shown.length,1);assert.equal(w.shown[0].title,"Bantuan SIP");assert.ok(!JSON.stringify(w.shown).includes(payload.privateText));
  assert.equal(w.requests[0].options.credentials,"same-origin");assert.equal(w.requests[0].options.cache,"no-store");
  assert.equal(delivered[0].type,"BANTUAN_PUSH_RECEIVED");
});
test("queued push is dropped after logout, account switch, revoked access or unregister",async()=>{
  for(const scenario of [{status:401},{status:403},{context:{enabled:true,registered:true,binding:"new-session"}},{context:{enabled:true,registered:false,binding:"current"}},{context:{enabled:false,registered:true,binding:"current"}}]){
    const w=worker(scenario);await w.dispatch("push",push(payload));assert.equal(w.shown.length,0);
  }
});
test("foreign payloads do not trigger a lookup or notification",async()=>{
  const w=worker();await w.dispatch("push",push({notification:{body:"arbitrary"}}));assert.equal(w.requests.length,0);assert.equal(w.shown.length,0);
});

test("unbound standard Web Push and malformed messages never bypass Firebase session checks",async()=>{
  const w=worker();
  for(const json of [()=>({title:"Old notification",body:"Wrong session"}),()=>{throw new Error("bad JSON");}]){
    await w.dispatch("push",{data:{json},waitUntil(promise){this.pending=promise;}});
  }
  assert.equal(w.requests.length,0);assert.equal(w.shown.length,0);
});
test("notification clicks ignore payload URLs and only open the internal notification page",async()=>{
  const w=worker(),event={notification:{data:{type:"bantuan_pwa",url:"https://untrusted.example"},close(){}},waitUntil(p){this.pending=p;}};
  await w.dispatch("notificationclick",event);assert.deepEqual(w.opened,["https://example.test/bantuan-app/notifikasi"]);
});
test("notification clicks reuse only a window belonging to this PWA",async()=>{
  const actions=[],client={url:"https://example.test/bantuan-app/beranda",navigate:async url=>actions.push(url),focus:async()=>actions.push("focus")};
  const w=worker({clients:[client]}),event={notification:{data:{type:"bantuan_pwa"},close(){}},waitUntil(p){this.pending=p;}};
  await w.dispatch("notificationclick",event);assert.deepEqual(actions,["https://example.test/bantuan-app/notifikasi","focus"]);assert.equal(w.opened.length,0);
});
