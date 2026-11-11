import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import vm from "node:vm";
import test from "node:test";

const nativeRequire=createRequire(import.meta.url),ts=nativeRequire("typescript");
const React=nativeRequire("react"),{renderToStaticMarkup}=nativeRequire("react-dom/server");
const cache=new Map();
let routeViewer=null;
function load(filename){
  const full=path.resolve(filename);
  if(cache.has(full))return cache.get(full).exports;
  const loadedModule={exports:{}};cache.set(full,loadedModule);
  const localRequire=id=>{
    if(id==="next/navigation")return {useSearchParams:()=>new URLSearchParams(),usePathname:()=>"/admin/bantuan/pengajuan",useRouter:()=>({push(){},replace(){},refresh(){},prefetch(){}}),redirect:target=>{throw new Error("REDIRECT:"+target);},notFound:()=>{throw new Error("NOT_FOUND");}};
    if(id==="@/lib/api")return {apiRequest:async target=>{if(target==="bantuan/viewer")return routeViewer;throw new Error("Unexpected API request: "+target);}};
    if(id==="next/link")return {__esModule:true,default:({children,...props})=>React.createElement("a",props,children)};
    if(id.endsWith(".css"))return {__esModule:true,default:new Proxy({},{get:(_target,key)=>String(key)})};
    if(id.startsWith(".")||id.startsWith("@/")){
      const root=id.startsWith("@/")?path.resolve(id.slice(2)):path.resolve(path.dirname(full),id);
      return load([root,root+".ts",root+".tsx"].find(candidate=>existsSync(candidate)));
    }
    return nativeRequire(id);
  };
  const compiled=ts.transpileModule(readFileSync(full,"utf8"),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  vm.runInNewContext(compiled,{module:loadedModule,exports:loadedModule.exports,require:localRequire,URLSearchParams,crypto:nativeRequire("node:crypto").webcrypto},{filename:full});
  return loadedModule.exports;
}
const {navigation,canViewRoute}=load("modules/bantuan/policy.ts");
const {validPwaRoute,pwaWorkspaceRoute}=load("modules/bantuan/pwa/policy.ts");
const {workspaceHref}=load("modules/bantuan/workspace-routing.ts");
const {PwaApp}=load("modules/bantuan/pwa/PwaApp.tsx");
const {Workspace}=load("modules/bantuan/components/Workspace.tsx");
const viewer=(role,roles=[role])=>({id:"test",code:"TEST01",name:"Petugas",role,roles,canBypass:true,settings:{programs:["Kebutuhan Pokok"],regions:[],housing:[],distributionDays:7,minimumSurveyPhotos:5}});
const roles=["admin","requester","call_center","verifier","volunteer","approver","chair","observer","survey_approver","fund_requester","treasurer"];

test("every web menu is available through PWA with identical role guards",()=>{
 for(const role of roles){
  const user=viewer(role);
  for(const item of navigation(user)){
   const route=item.key?item.key.split("/"):[];
   assert.equal(validPwaRoute(route.length?["workspace",...route]:["beranda"],user),true,`${role}: ${item.key}`);
  }
  for(const key of ["tim","pengaturan","audit","mustahiq","santunan","pengajuan/baru","pengajuan/langsung","review-tahap-1","review-tahap-2"]){
   assert.equal(validPwaRoute(["workspace",...key.split("/")],user),canViewRoute(user,key.split("/")),`${role}: ${key}`);
  }
 }
 assert.equal(validPwaRoute(["workspace","tim"],viewer("verifier",["verifier","admin"])),true);
 assert.equal(validPwaRoute(["workspace","tim"],viewer("verifier")),false);
 assert.equal(validPwaRoute(["workspace","..","tim"],viewer("admin")),false);
 assert.equal(validPwaRoute(["workspace","pengajuan","id","unexpected"],viewer("admin")),false);
});

test("mobile routes preserve query and fragment and never rewrite APIs or foreign modules",()=>{
 assert.equal(workspaceHref("/admin/bantuan/pengajuan/abc/edit?from=survei#foto",true),"/bantuan-app/workspace/pengajuan/abc/edit?from=survei#foto");
 assert.equal(workspaceHref("/admin/bantuan",true),"/bantuan-app/beranda");
 assert.equal(workspaceHref("/admin/bantuan/",true),"/bantuan-app/beranda");
 assert.equal(workspaceHref("/admin/bantuan/?from=",true),"/bantuan-app/beranda?from=");
 assert.equal(workspaceHref("/admin/login",true),"/bantuan-app/login");
 for(const href of ["/api/bantuan/export?states=completed","/admin/modul","https://example.org/admin/bantuan","/admin/bantuan-other"]){assert.equal(workspaceHref(href,true),href);}
 assert.equal(workspaceHref("/admin/bantuan/tim",false),"/admin/bantuan/tim");
});

test("legacy task and home URLs open shared dashboard routes without losing volunteer access",()=>{
 assert.equal(pwaWorkspaceRoute(["tugas","abc"],viewer("verifier")).join("/"),"pengajuan/abc");
 assert.equal(pwaWorkspaceRoute(["beranda"],viewer("volunteer")).join("/"),"santunan");
 assert.equal(pwaWorkspaceRoute(["beranda"],viewer("volunteer",["volunteer","requester"])).join("/"),"");
});

test("PWA renders the actual web dashboard menus for all roles and keeps internal links in scope",()=>{
 for(const role of roles){
  const user=viewer(role);
  const html=renderToStaticMarkup(React.createElement(PwaApp,{viewer:user,route:["beranda"]}));
  assert.doesNotMatch(html,/aria-controls="bantuan-sidebar"/);
  assert.doesNotMatch(html,/Tutup semua menu/);
  assert.match(html,/Navigasi aplikasi/);
  assert.doesNotMatch(html,/href="\/admin\/bantuan(?:[\/"?#])/);
  assert.match(html,/href="\/bantuan-app\/akun"/);
  assert.equal(html.includes('href="/bantuan-app/workspace/tim"'),role==="admin");
 }
 const web=renderToStaticMarkup(React.createElement(Workspace,{route:[],initialViewer:viewer("admin")}));
 assert.match(web,/href="\/admin\/bantuan\/tim"/);
 assert.doesNotMatch(web,/aria-label="Navigasi aplikasi"/);
});
