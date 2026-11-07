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
  const module={exports:{}};cache.set(full,module);
  const localRequire=id=>{
    if(id==="next/navigation")return {useSearchParams:()=>new URLSearchParams(),usePathname:()=>"/admin/bantuan/pengajuan",useRouter:()=>({push(){},replace(){},refresh(){}}),redirect:target=>{throw new Error("REDIRECT:"+target);},notFound:()=>{throw new Error("NOT_FOUND");}};
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
  vm.runInNewContext(compiled,{module,exports:module.exports,require:localRequire,URLSearchParams,crypto:nativeRequire("node:crypto").webcrypto},{filename:full});
  return module.exports;
}
const {isWorkItem,queueCount}=load("modules/bantuan/workspace-guide.ts");
const {navigation,canViewRoute}=load("modules/bantuan/policy.ts");
const {ProcessHub}=load("modules/bantuan/components/ProcessHub.tsx");
const {LoadingState}=load("modules/bantuan/components/LoadingState.tsx");
const viewer=role=>({id:"test",name:"Petugas",role,canBypass:true,settings:{programs:["Kebutuhan Pokok"],regions:[],housing:[],distributionDays:7,minimumSurveyPhotos:5}});
const stats={total:5,byStatus:{draft:1,survey_assigned:3,completed:1},byProgram:{},bySource:{},approvedAmount:0,disbursedAmount:0,completedAmount:0,overdue:0,tickets:[],taskCounts:{survey:{survey_assigned:1},distribution:{}}};

test("multiple roles expose their combined menus, work and actions without granting management or self approval",()=>{
  const who={...viewer("requester"),roles:["requester","verifier","fund_requester"]};
  const menus=navigation(who),keys=menus.map(menu=>menu.key);
  for(const key of ["pengajuan/baru","survei","penyaluran","dana-siap","dana-diajukan"])assert.ok(keys.includes(key),key);
  assert.equal(new Set(keys).size,keys.length);
  for(const menu of menus)assert.equal(canViewRoute(who,menu.key.split("/").filter(Boolean)),true,menu.key);
  assert.equal(canViewRoute(who,["tim"]),false);
  for(const key of ["draft","survei","dana-siap"])assert.equal(isWorkItem(who,menus.find(menu=>menu.key===key)),true,key);
  assert.equal(queueCount(who,stats,menus.find(menu=>menu.key==="survei")),1);
  const {getAvailableActions}=load("modules/bantuan/components/ActionPanel.tsx");
  const row={id:"test-aid",status:"survey_assigned",source:"online",intakeRole:"call_center",createdBy:"other",verifierId:who.id};
  assert.ok(getAvailableActions(row,who).some(action=>action.key==="survey_submit"));
  assert.ok(getAvailableActions({...row,status:"fund_ready"},who).some(action=>action.key==="fund_submit"));
  assert.ok(!getAvailableActions({...row,status:"survey_submitted",createdBy:who.id},{...who,roles:[...who.roles,"approver"]}).some(action=>action.key==="approve"));
});

test("survey results stop at Call Center and only the assigned verifier may decline a task",()=>{
  const {getAvailableActions}=load("modules/bantuan/components/ActionPanel.tsx");
  const cc=viewer("call_center"),row={id:"survey",status:"survey_cc_review",source:"online",createdBy:cc.id,verifierId:"field-person"};
  assert.ok(getAvailableActions(row,cc).some(action=>action.key==="survey_review_submit"));
  assert.ok(!getAvailableActions(row,viewer("approver")).some(action=>action.key==="approve"));
  assert.ok(getAvailableActions({...row,verifierId:cc.id},cc).some(action=>action.key==="survey_review_submit"));
  const field=viewer("verifier"),assigned={...row,status:"survey_assigned",verifierId:field.id};
  assert.ok(getAvailableActions(assigned,field).some(action=>action.key==="survey_decline"));
  assert.ok(!getAvailableActions({...assigned,verifierId:"other"},field).some(action=>action.key==="survey_decline"));
  assert.ok(navigation(cc).some(menu=>menu.key==="review-survei-cc"));
});

test("funding cards expose only permitted routes and replace individual decisions for active grouped aid",()=>{
  const {getAvailableActions}=load("modules/bantuan/components/ActionPanel.tsx");
  const who=viewer("fund_requester"),row={id:"aid",status:"fund_submitted",source:"online",createdBy:"other",fundingRequest:{id:"card",number:"DANA-TEST"}};
  assert.ok(!getAvailableActions(row,who).some(action=>["fund_approve","fund_reject"].includes(action.key)));
  for(const role of ["fund_requester","treasurer","chair","admin"])assert.equal(canViewRoute(viewer(role),["pengajuan-dana"]),true);
  for(const role of ["verifier","requester","call_center"])assert.equal(canViewRoute(viewer(role),["pengajuan-dana"]),false);
  const {FundingRequests}=load("modules/bantuan/components/FundingRequests.tsx");
  const html=renderToStaticMarkup(React.createElement(FundingRequests,{viewer:who}));
  assert.match(html,/Tandai sedang diajukan/);assert.match(html,/Memuat bantuan/);assert.doesNotMatch(html,/Belum ada kartu yang sesuai/);
});

test("operational headers remove role switching and show the module launcher only with admin permission",()=>{
  const {Workspace}=load("modules/bantuan/components/Workspace.tsx");
  for(const [role,canChooseModules,visible] of [["requester",false,false],["requester",true,true],["admin",true,true]]){
    const html=renderToStaticMarkup(React.createElement(Workspace,{route:[],initialViewer:{...viewer(role),roles:[role,"verifier"],canChooseModules}}));
    assert.equal(html.includes("Pilihan modul"),visible,role+":"+canChooseModules);
    assert.doesNotMatch(html,/Ganti peran|Gunakan peran|Peran aktif/);
  }
});

test("adding a distribution role keeps the dashboard and owned intake accessible alongside santunan",()=>{
  const who={...viewer("volunteer"),roles:["volunteer","requester"]};
  assert.equal(canViewRoute(who,[]),true);
  assert.equal(canViewRoute(who,["santunan"]),true);
  assert.equal(canViewRoute(who,["pengajuan","baru"]),true);
  const {canEditIntake,intakeViewer}=load("modules/bantuan/permissions.ts");
  const row={status:"draft",source:"online",createdBy:who.id};
  assert.equal(canEditIntake(who,row),true);
  assert.equal(canEditIntake(who,{...row,createdBy:"another"}),false);
  assert.equal(intakeViewer(who).role,"requester");
  const combined={...who,roles:["requester","call_center","verifier"]};
  assert.equal(intakeViewer(combined).role,"call_center");
});

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

test("staff application actions expose submission and early cancellation but never self review",()=>{
  const {getAvailableActions}=load("modules/bantuan/components/ActionPanel.tsx");
  const who=viewer("requester"),row={id:"aid",status:"draft",source:"online",intakeRole:"requester",createdBy:who.id};
  assert.deepEqual(Array.from(getAvailableActions(row,who),action=>action.key),["submit","cancel"]);
  assert.equal(getAvailableActions({...row,createdBy:"someone-else"},who).length,0);
  assert.deepEqual(Array.from(getAvailableActions({...row,status:"screening"},who),action=>action.key),["cancel"]);
  assert.equal(getAvailableActions({...row,status:"review1"},who).length,0);
  const review=getAvailableActions({...row,status:"screening"},viewer("call_center"));
  assert.ok(review.every(action=>!["screen_pass","screen_reject"].includes(action.key)));
  const otherReview=getAvailableActions({...row,status:"screening",createdBy:"other-staff"},viewer("call_center"));
  assert.ok(otherReview.some(action=>action.key==="screen_pass"));
  const {bantuanRoles}=load("contracts/modules/bantuan.ts");
  assert.equal(bantuanRoles.requester,"Petugas Pengajuan");
  assert.equal(bantuanRoles.volunteer,"Penyalur");
});

test("role workspaces distinguish work from monitoring rather than asking users to guess stages",()=>{
  const cc=navigation(viewer("call_center"));
  assert.equal(isWorkItem("call_center",cc.find(item=>item.key==="penugasan-survei")),true);
  assert.equal(isWorkItem("call_center",cc.find(item=>item.key==="monitor-survei")),false);
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
    const html=renderToStaticMarkup(React.createElement(ApplicationList,{...props,view,viewer:viewer("call_center")}));
    for(const label of ["Pemohon Contoh","BNT-TEST-001","Kesehatan","Online / WhatsApp","Petugas Survei","Selesai","3.500.000"])assert.ok(html.includes(label),view+": "+label);
    assert.match(html,/<input[^>]*type="checkbox"[^>]*disabled/);
    assert.match(html,/Menampilkan 1–1 dari 1 pengajuan/);
    assert.match(html,/href="\/admin\/bantuan\/pengajuan\/application-one\?from=pengajuan"/);
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
  assert.match(html,/Cari dan pantau pengajuan sesuai akses Anda/);
  assert.match(html,/Prioritas sesuai tugas Anda/);
  const workLink=html.match(/<a[^>]*href="\/admin\/bantuan\/proses"[\s\S]*?<\/a>/)?.[0];
  assert.match(workLink,/aria-label="10 pengajuan"/);
  const destinations=[...html.matchAll(/href="([^"]+)"/g)].map(match=>match[1]);
  assert.equal(new Set(destinations).size,destinations.length);
  assert.ok(destinations.includes("/admin/bantuan/berjalan"));
  for(const target of destinations)assert.equal(canViewRoute(viewer("call_center"),target.replace("/admin/bantuan","").split("/").filter(Boolean)),true);
});
