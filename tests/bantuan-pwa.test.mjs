import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import {createRequire} from "node:module";
import vm from "node:vm";
const require=createRequire(import.meta.url),ts=require("typescript");
function compile(file,dependencies={}){const context={exports:{},URLSearchParams,Response,require:key=>{if(key in dependencies)return dependencies[key];throw new Error(key);}};vm.runInNewContext(ts.transpileModule(readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText,context);return context.exports;}
const contract=compile("contracts/modules/bantuan.ts");
const permissions=compile("modules/bantuan/permissions.ts",{"@/contracts/modules/bantuan":contract});
const policy=compile("modules/bantuan/pwa/policy.ts",{"../permissions":permissions});
function viewer(roles){return {id:"me",name:"Petugas",role:roles[0],roles,canBypass:false,settings:{}};}
test("PWA tabs and routes follow operational permissions including combined roles",()=>{
  const penyalur=viewer(["volunteer"]),verifier=viewer(["verifier"]),bendahara=viewer(["treasurer"]);
  assert.equal(policy.validPwaRoute(["santunan"],penyalur),true);
  assert.equal(policy.validPwaRoute(["tugas","any-id"],penyalur),false);
  assert.equal(policy.validPwaRoute(["santunan"],verifier),false);
  assert.equal(policy.validPwaRoute(["tugas","any-id"],verifier),true);
  assert.equal(policy.validPwaRoute(["tim"],bendahara),false);
  assert.equal(policy.validPwaRoute(["tugas","x","edit"],bendahara),false);
  assert.equal(policy.validPwaRoute(["tugas","../secrets"],verifier),false);
  assert.equal(policy.pwaAccess(viewer(["verifier","volunteer"])).santunan,true);
  assert.equal(policy.pwaTabs(viewer(["verifier","volunteer"])).length,5);
  for(const role of ["requester","call_center","approver","chair","fund_requester"]){
    assert.equal(policy.pwaAccess(viewer([role])).tasks,true,`${role} should see tasks`);
    assert.equal(policy.validPwaRoute(["tugas"],viewer([role])),true,`${role} task route`);
  }
});
test("survey and distribution task queues use identity filters and validated pagination",()=>{
  const user=viewer(["verifier"]);
  const survey=new URLSearchParams(policy.taskQuery(user,"survey",2,"nama penerima"));
  assert.equal(survey.get("verifierId"),"me");assert.equal(survey.get("states"),"survey_assigned");assert.equal(survey.get("page"),"2");assert.equal(survey.get("search"),"nama penerima");
  const distribution=new URLSearchParams(policy.taskQuery(user,"distribution",1,""));assert.equal(distribution.get("distributorId"),"me");
  const transfer=new URLSearchParams(policy.taskQuery(viewer(["treasurer"]),"transfer",1,""));assert.equal(transfer.get("states"),"fund_approved");assert.equal(transfer.has("distributorId"),false);
});
test("call center and decision roles receive their mobile work queues",()=>{
  const callCenter=viewer(["call_center"]);
  assert.deepEqual(Array.from(policy.taskKinds(callCenter)),["intake","assignment","survey_review","distribution"]);
  const intake=new URLSearchParams(policy.taskQuery(callCenter,"intake",1,""));
  assert.equal(intake.get("states"),"draft,needs_data,screening");
  const assignment=new URLSearchParams(policy.taskQuery(callCenter,"assignment",1,""));
  assert.equal(assignment.get("states"),"survey_assignment,approved");
  const distribution=new URLSearchParams(policy.taskQuery(callCenter,"distribution",1,""));
  assert.equal(distribution.has("distributorId"),false);
  assert.deepEqual(Array.from(policy.taskKinds(viewer(["approver"]))),["approval"]);
  assert.deepEqual(Array.from(policy.taskKinds(viewer(["fund_requester"]))),["funding","transfer"]);
});
function worker(network=async()=>new Response("live")){
 const handlers={},cached=[],deleted=[],shown=[],opened=[],windows=[];
 const cache={addAll:async values=>cached.push(...values),match:async()=>null};
 const context={URL,Response,fetch:network,caches:{open:async()=>cache,match:async()=>new Response("offline public shell"),keys:async()=>["bantuan-pwa-shell-old","another-module-cache"],delete:async key=>deleted.push(key)},self:{location:{origin:"https://example.test"},addEventListener:(type,callback)=>handlers[type]=callback,registration:{showNotification:async(title,options)=>shown.push({title,...options})},clients:{claim:async()=>{},matchAll:async()=>windows,openWindow:async url=>opened.push(url)},skipWaiting:()=>{}}};
 vm.runInNewContext(readFileSync("public/bantuan-app/sw.js","utf8"),context);return {handlers,cached,deleted,shown,opened,windows};
}
function event(path,options={}){return {request:{url:"https://example.test"+path,method:"GET",mode:"cors",...options},response:null,respondWith(promise){this.response=promise;},waitUntil(promise){this.pending=promise;}};}
test("service worker never intercepts or caches API requests, private photos, mutations, or other modules",async()=>{
 const w=worker();for(const [path,options] of [["/api/bantuan/applications",{}],["/api/bantuan/documents/private-id",{}],["/bantuan-app/tugas",{method:"POST"}],["/admin/bantuan",{mode:"navigate"}]]){const e=event(path,options);w.handlers.fetch(e);assert.equal(e.response,null);}
 const install=event("/");w.handlers.install(install);await install.pending;
 assert.equal(w.cached.length,4);assert.ok(w.cached.every(path=>path.endsWith(".png")||path==="/bantuan-app/offline.html"));
 const activate=event("/");w.handlers.activate(activate);await activate.pending;assert.deepEqual(w.deleted,["bantuan-pwa-shell-old"]);
});
test("authenticated PWA navigation uses network, with a generic offline fallback and no cache writes",async()=>{
 const online=worker(),page=event("/bantuan-app/tugas",{mode:"navigate"});online.handlers.fetch(page);assert.equal(await (await page.response).text(),"live");assert.equal(online.cached.length,0);
 const offline=worker(async()=>{throw new Error("offline");}),fallback=event("/bantuan-app/santunan",{mode:"navigate"});offline.handlers.fetch(fallback);assert.equal(await (await fallback.response).text(),"offline public shell");
});

test("push shows bounded notification text without caching private data and tolerates malformed payload",async()=>{
  const w=worker(),e=event("/");
  e.data={json:()=>({title:"SIPERP Bantuan",body:"Ada pembaruan bantuan.",tag:"id-b",url:"https://evil.test"})};
  w.handlers.push(e);await e.pending;
  assert.equal(w.shown[0].title,"SIPERP Bantuan");assert.equal(w.shown[0].body,"Ada pembaruan bantuan.");
  assert.equal(w.shown[0].data.url,"/bantuan-app/notifikasi");assert.equal(w.cached.length,0);
  e.data={json:()=>{throw new Error("bad json");}};w.handlers.push(e);await e.pending;
  assert.equal(w.shown[1].title,"SIPERP Bantuan");
  e.data={json:()=>({title:"a".repeat(500),body:"b".repeat(500)})};w.handlers.push(e);await e.pending;
  assert.equal(w.shown[2].title.length,100);assert.equal(w.shown[2].body.length,300);
});

test("notification click opens only the authenticated PWA inbox or focuses its existing window",async()=>{
  const w=worker(),e=event("/");let closed=0,focused=0,navigated="";
  e.notification={data:{url:"https://evil.test"},close:()=>closed++};
  w.handlers.notificationclick(e);await e.pending;
  assert.equal(closed,1);assert.deepEqual(w.opened,["https://example.test/bantuan-app/notifikasi"]);
  w.windows.push({url:"https://example.test/bantuan-app/beranda",navigate:async url=>{navigated=url;},focus:async()=>focused++});
  w.handlers.notificationclick(e);await e.pending;
  assert.equal(focused,1);assert.equal(navigated,"https://example.test/bantuan-app/notifikasi");assert.equal(w.opened.length,1);
});


test("manifest is scoped to Bantuan and supplies real install icons including maskable",async()=>{
  const manifestModule=compile("modules/bantuan/pwa/manifest.ts");
  const response=manifestModule.GET();
  assert.match(response.headers.get("content-type"),/application\/manifest\+json/);
  const manifest=await response.json();
  assert.equal(manifest.scope,"/bantuan-app/");assert.equal(manifest.start_url,"/bantuan-app/beranda");assert.equal(manifest.display,"standalone");
  assert.ok(manifest.icons.some(icon=>icon.purpose==="maskable"));
  for(const icon of manifest.icons){const png=readFileSync(`public${icon.src}`);const width=png.readUInt32BE(16),height=png.readUInt32BE(20);assert.equal(icon.sizes,`${width}x${height}`);}
});

test("server gate redirects anonymous users before reading module data and rejects unauthorized task routes",async()=>{
  let session=null,apiCalls=0;
  const redirect=path=>{throw new Error(`redirect:${path}`);};
  const page=compile("modules/bantuan/pwa/page.tsx",{
    "react/jsx-runtime":{jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})},
    "next/navigation":{redirect,notFound:()=>{throw new Error("not-found");}},
    "@/lib/auth":{getSession:async()=>session,hasModuleAccess:user=>user?.moduleSlugs.includes("bantuan")},
    "@/lib/api":{apiRequest:async()=>{apiCalls++;return viewer(["volunteer"]);},ApiError:class extends Error{}},
    "./PwaApp":{PwaApp:()=>null},"./policy":policy,"next/link":{default:()=>null},"./Pwa.module.css":{default:{}},
  }).default;
  await assert.rejects(page({params:Promise.resolve({path:["beranda"]})}),/redirect:\/bantuan-app\/login/);
  assert.equal(apiCalls,0);
  session={moduleSlugs:[]};await page({params:Promise.resolve({path:["beranda"]})});assert.equal(apiCalls,0);
  session={moduleSlugs:["bantuan"]};await assert.rejects(page({params:Promise.resolve({path:["tugas"]})}),/not-found/);
});
