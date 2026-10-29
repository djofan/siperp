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
    if(id==="next/navigation")return {useRouter:()=>({push(){},replace(){},refresh(){}}),redirect:target=>{throw new Error("REDIRECT:"+target);},notFound:()=>{throw new Error("NOT_FOUND");}};
    if(id==="@/lib/api")return {apiRequest:async target=>{if(target==="bantuan/viewer")return routeViewer;throw new Error("Unexpected API request: "+target);}};
    if(id==="next/link")return {__esModule:true,default:({children,...props})=>React.createElement("a",props,children)};
    if(id.endsWith(".css"))return {__esModule:true,default:new Proxy({},{get:(_target,key)=>String(key)})};
    if(id.startsWith(".")||id.startsWith("@/")){
      const root=id.startsWith("@/")?path.resolve(id.slice(2)):path.resolve(path.dirname(full),id);
      return load([root,root+".ts",root+".tsx"].find(candidate=>existsSync(candidate)));
    }
    return nativeRequire(id);
  };
  const compiled=ts.transpileModule(readFileSync(full,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
  vm.runInNewContext(compiled,{module:loadedModule,exports:loadedModule.exports,require:localRequire,URLSearchParams,crypto:nativeRequire("node:crypto").webcrypto},{filename:full});
  return loadedModule.exports;
}
const {isWorkItem,queueCount}=load("modules/bantuan/workspace-guide.ts");
const {navigation,canViewRoute}=load("modules/bantuan/policy.ts");
const {ProcessHub}=load("modules/bantuan/components/ProcessHub.tsx");
const {LoadingState}=load("modules/bantuan/components/LoadingState.tsx");
const viewer=role=>({id:"test",name:"Petugas",role,canBypass:true,settings:{programs:["Kebutuhan Pokok"],regions:[],housing:[],distributionDays:7,minimumSurveyPhotos:5}});
const stats={total:5,byStatus:{draft:1,survey_assigned:3,completed:1},byProgram:{},bySource:{},approvedAmount:0,disbursedAmount:0,completedAmount:0,overdue:0,tickets:[],taskCounts:{survey:{survey_assigned:1},distribution:{}}};

test("all decisions and the internal comment form are visible without expanding hidden menus",()=>{
  const {ActionPanel}=load("modules/bantuan/components/ActionPanel.tsx");
  const html=renderToStaticMarkup(React.createElement(ActionPanel,{viewer:viewer("approver"),row:{id:"aid",number:"BNT-TEST",status:"review1",source:"online",applicant:{},documents:[],version:1,createdBy:"call-center"},staff:[],reload(){}}));
  assert.match(html,/Setujui untuk survei/);
  assert.match(html,/Minta lengkapi data/);
  assert.match(html,/Tolak pengajuan/);
  assert.doesNotMatch(html,/<details|<summary|Tambah catatan internal/);
  assert.match(html,/<textarea[^>]*name="reason"/);
  assert.match(html,/Simpan catatan/);
  assert.match(html,/tidak mengubah status pengajuan/);
  assert.match(html,/data-tone="danger"/);
});

test("role workspaces distinguish work from monitoring rather than asking users to guess stages",()=>{
  const cc=navigation(viewer("call_center"));
  assert.equal(isWorkItem("call_center",cc.find(item=>item.key==="penugasan-survei")),true);
  assert.equal(isWorkItem("call_center",cc.find(item=>item.key==="survei")),false);
  const fund=navigation(viewer("fund_requester"));
  assert.equal(isWorkItem("fund_requester",fund.find(item=>item.key==="pencairan")),false);
});

test("verifier task totals count the right assignment and do not report unknown totals as zero",()=>{
  const who=viewer("verifier"),survey=navigation(who).find(item=>item.key==="survei");
  assert.equal(queueCount(who,stats,survey),1);
  assert.equal(queueCount(who,null,survey),null);
  assert.equal(queueCount(who,{...stats,taskCounts:undefined},survey),null);
});

test("loading markup communicates progress and never displays empty success or creation actions",()=>{
  for(const variant of ["list","detail","cards"]){
    const html=renderToStaticMarkup(React.createElement(LoadingState,{variant,label:"Memuat data pengajuan…"}));
    assert.match(html,/role="status"/);
    assert.doesNotMatch(html,/✓|0 pengajuan|Buat pengajuan|Tidak ada pengajuan/);
  }
});

test("the actual list, detail and staff pages do not claim empty data during their initial load",()=>{
  const {Workspace}=load("modules/bantuan/components/Workspace.tsx");
  const list=renderToStaticMarkup(React.createElement(Workspace,{route:["pengajuan"],initialViewer:viewer("call_center")}));
  assert.match(list,/Memuat daftar pengajuan/);
  assert.doesNotMatch(list,/✓|0 pengajuan|Belum ada pengajuan di sini|Antrean tahap ini kosong/);
  const detail=renderToStaticMarkup(React.createElement(Workspace,{route:["pengajuan","example-id"],initialViewer:viewer("call_center")}));
  assert.match(detail,/Memuat detail pengajuan/);
  const team=renderToStaticMarkup(React.createElement(Workspace,{route:["tim"],initialViewer:viewer("admin")}));
  assert.match(team,/Memuat daftar anggota tim/);
  assert.doesNotMatch(team,/Belum ada anggota/);
});

test("workspaces render only authorized links for every operational role",()=>{
  for(const role of ["admin","call_center","verifier","fund_requester","treasurer","approver","chair"]){
    const who=viewer(role);
    const html=renderToStaticMarkup(React.createElement(ProcessHub,{viewer:who,dashboard:stats}));
    for(const [,target] of html.matchAll(/href="([^"]+)"/g)){
      const route=target.replace("/admin/bantuan","").split("/").filter(Boolean);
      assert.equal(canViewRoute(who,route),true,role+": "+target);
    }
    assert.match(html,/Cara kerja Anda/);
    assert.match(html,/Perlu Anda kerjakan/);
  }
});

test("loading, empty and failure are different rendered workspace states",()=>{
  const who=viewer("fund_requester");
  const loading=renderToStaticMarkup(React.createElement(ProcessHub,{viewer:who,dashboard:null}));
  assert.match(loading,/Memuat pekerjaan Anda/);
  assert.doesNotMatch(loading,/Tidak ada pekerjaan tertunda|0 pengajuan/);
  const empty=renderToStaticMarkup(React.createElement(ProcessHub,{viewer:who,dashboard:{...stats,byStatus:{}}}));
  assert.match(empty,/Tidak ada pekerjaan tertunda/);
  const failed=renderToStaticMarkup(React.createElement(ProcessHub,{viewer:who,dashboard:null,failed:true}));
  assert.match(failed,/Pekerjaan belum berhasil dimuat/);
  assert.match(failed,/Coba lagi/);
  assert.doesNotMatch(failed,/Memuat pekerjaan Anda|Tidak ada pekerjaan tertunda/);
});

test("Dashboard and Pekerjaan saya render different pages through the real server route for every role",async()=>{
  const Page=load("app/admin/bantuan/[[...path]]/page.tsx").default;
  for(const role of ["admin","call_center","approver","chair","verifier","fund_requester","treasurer"]){
    routeViewer=viewer(role);
    const dashboard=await Page({params:Promise.resolve({path:[]})});
    assert.equal(dashboard.props.route.length,0);
    const dashboardHtml=renderToStaticMarkup(dashboard);
    assert.match(dashboardHtml,/<h1>Dashboard<\/h1>/,role);
    assert.doesNotMatch(dashboardHtml,/<h1>Pekerjaan saya<\/h1>/,role);
    const work=await Page({params:Promise.resolve({path:["proses"]})});
    const workHtml=renderToStaticMarkup(work);
    assert.match(workHtml,/<h1>Pekerjaan saya<\/h1>/,role);
    assert.doesNotMatch(workHtml,/<h1>Dashboard<\/h1>/,role);
    if(role!=="admin"){
      await assert.rejects(Page({params:Promise.resolve({path:["tim"]})}),/REDIRECT:\/admin\/bantuan$/);
      await Page({params:Promise.resolve({path:[]})});
    }
  }
  routeViewer=viewer("volunteer");
  await assert.rejects(Page({params:Promise.resolve({path:[]})}),/REDIRECT:\/admin\/bantuan\/santunan$/);
});

test("Dashboard links stay within the current role's routes",()=>{
  const {Dashboard}=load("modules/bantuan/components/Dashboard.tsx");
  for(const role of ["admin","call_center","approver","chair","verifier","fund_requester","treasurer"]){
    const who=viewer(role);
    const html=renderToStaticMarkup(React.createElement(Dashboard,{viewer:who,dashboard:stats,failed:false,onRetry(){}}));
    assert.match(html,/Perkembangan pengajuan/);
    for(const [,target] of html.matchAll(/href="([^"]+)"/g)){
      const route=target.replace("/admin/bantuan","").split("/").filter(Boolean);
      assert.equal(canViewRoute(who,route),true,role+": "+target);
    }
  }
});

test("card and table views show the same application and preserve batch eligibility",()=>{
  const {ApplicationList}=load("modules/bantuan/components/ApplicationList.tsx");
  const record={id:"application-one",number:"BNT-TEST-001",name:"Pemohon Contoh",program:"Kesehatan",source:"online",region:"Bandung",status:"completed",amount:3500000,verifierId:"verifier-one",distributorId:"verifier-one",distributionType:"verifier",createdAt:"2026-10-28T08:00:00Z"};
  const props={page:{data:[record],current_page:1,last_page:1,total:1,per_page:12},staff:[{id:"verifier-one",name:"Petugas Survei"}],selected:{},onSelect(){},selectable:true,canSelect:()=>false,refreshing:false,number:1,onPageChange(){},perPage:"12",onPerPageChange(){}};
  for(const view of ["cards","table"]){
    const html=renderToStaticMarkup(React.createElement(ApplicationList,{...props,view}));
    for(const label of ["Pemohon Contoh","BNT-TEST-001","Kesehatan","Online / WhatsApp","Petugas Survei","Selesai","3.500.000"])assert.ok(html.includes(label),view+": "+label);
    assert.match(html,/<input[^>]*type="checkbox"[^>]*disabled/);
    assert.match(html,/Menampilkan 1–1 dari 1 pengajuan/);
    assert.match(html,/href="\/admin\/bantuan\/pengajuan\/application-one"/);
    assert.equal(html.includes("<table"),view==="table");
    assert.equal(html.includes("<article"),view==="cards");
  }
});

test("filter queries keep queue boundaries and verifier assignment while validating ranges",()=>{
  const {applicationParams,defaultFilters,validateFilters,activeFilterChips}=load("modules/bantuan/list-filters.ts");
  const filters={...defaultFilters,status:"disbursed",program:"Kesehatan",source:"online",from:"2026-10-01",to:"2026-10-28",dateField:"disbursed",amountMin:"0",amountMax:"3500000",distributorId:"me",sort:"amount_high"};
  const params=applicationParams(viewer("verifier"),"penyaluran",filters,2);
  assert.equal(params.get("task"),"distribution");
  assert.equal(params.get("states"),"disbursed");
  assert.equal(params.get("status"),"disbursed");
  assert.equal(params.get("amountMin"),"0");
  assert.equal(params.get("page"),"2");
  assert.equal(params.get("perPage"),"12");
  assert.equal(validateFilters(filters),"");
  assert.ok(validateFilters({...filters,from:"2026-11-01"}));
  assert.ok(validateFilters({...filters,amountMin:"4000000"}));
  assert.ok(validateFilters({...filters,amountMin:"1e6"}));
  assert.ok(validateFilters({...filters,amountState:"unset"}));
  assert.ok(activeFilterChips(filters).some(chip=>chip.label.includes("Minimal Rp0")));
  assert.equal(activeFilterChips(defaultFilters).length,0);
});

test("sidebar uses a few informative primary menus while work counts include hidden queues",()=>{
  const {SidebarMenu}=load("modules/bantuan/components/SidebarMenu.tsx");
  const html=renderToStaticMarkup(React.createElement(SidebarMenu,{viewer:viewer("call_center"),dashboard:{...stats,total:10,byStatus:{draft:1,needs_data:4,screening:2,survey_assignment:1,approved:2}},activeKey:"pengajuan",onNavigate(){}}));
  assert.match(html,/Cari dan pantau seluruh pengajuan/);
  assert.match(html,/Prioritas sesuai tugas Anda/);
  const workLink=html.match(/<a[^>]*href="\/admin\/bantuan\/proses"[\s\S]*?<\/a>/)?.[0];
  assert.match(workLink,/aria-label="10 pengajuan"/);
  const destinations=[...html.matchAll(/href="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(destinations.length,7);
  for(const target of destinations)assert.equal(canViewRoute(viewer("call_center"),target.replace("/admin/bantuan","").split("/").filter(Boolean)),true);
});
