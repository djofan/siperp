"use client";
import { HandoverReport } from "./HandoverReport";
import { AdminCorrection } from "./AdminCorrection";
import { attachmentAccept } from "../attachments";
import { PwaPushControl } from "../pwa/PwaPushControl";
import { PwaNotifications } from "../pwa/PwaNotifications";
import { canManageOwnPasswordInModule } from "../permissions";
import { ChangePassword } from "@/modules/core/ChangePassword";

import Link from "./WorkspaceNavigation";
import { useSearchParams } from "next/navigation";
import { useWorkspaceRouter as useRouter } from "./WorkspaceNavigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { bantuanRoles, bantuanStatuses, bantuanActionLabels } from "@/contracts/modules/bantuan";
import type { AidDashboard, AidDetail, AidNotification, AidPage, BantuanStaff, BantuanViewer } from "@/contracts/modules/bantuan";
import { day, money, request } from "../api/client";
import { preparePhotoUpload } from "../api/photos";
import { appendPhotoLocation } from "../photo-location";
import { navigation, sidebarNavigation, defaultListStates, processInfo, nextStep, menuGroups } from "../policy";
import { MenuGroup } from "./MenuGroup";
import { Mustahiq } from "./Mustahiq";
import { DecisionNotice } from "./DecisionNotice";
import { DeleteApplication } from "./DeleteApplication";
import { IntakeForm } from "./IntakeForm";
import { DependentsSummary } from "./Dependents";
import { ActionPanel, DocumentUpload } from "./ActionPanel";
import { Management } from "./Management";
import { ProcessHub } from "./ProcessHub";
import { ReportExport } from "./ReportExport";
import { SurveyReminder } from "./SurveyReminder";
import { Dashboard } from "./Dashboard";
import { ProcessSuccess } from "./ProcessSuccess";
import { Santunan } from "./Santunan";
import { FundingRequests } from "./FundingRequests";
import { SurveyMap } from "./SurveyMap";
import { rolesOf, hasRole, hasAnyRole, roleLabel, intakeViewer, canEditIntake } from "../permissions";
import { PageGuide } from "./PageGuide";
import { HelpButton } from "./HelpButton";
import { LoadingState } from "./LoadingState";
import { getAvailableActions, getActionSectionLabel } from "./ActionPanel";
import { ApplicantHistory } from "./ApplicantHistory";
import { ApplicationFilters } from "./ApplicationFilters";
import { DisbursementGroups } from "./DisbursementGroups";
import { useListView } from "../use-list-view";
import { ApplicationList } from "./ApplicationList";
import { SidebarMenu } from "./SidebarMenu";
import { AccountMenu } from "./AccountMenu";
import { activeFilterChips, applicationParams, reportFilterDescription, defaultFilters, type ListFilters } from "../list-filters";
import { Icon } from "./ui";
import { clearDrafts } from "../api/vault";
import { clearPhotoMemory } from "../api/photo-queue";
import s from "./Workspace.module.css";

export function Badge({ status }: { status: string }) {
  const tone=status==="completed"?s.green:status.startsWith("rejected")||["cancelled","delivery_failed"].includes(status)?s.red:["review1","survey_cc_review","survey_submitted","bypass_review","review2","fund_submitted"].includes(status)?s.amber:["survey_assigned","disbursed"].includes(status)?s.blue:"";
  return <span className={`${s.badge} ${tone}`}>{bantuanStatuses[status]??status}</span>;
}
export function Workspace({ route, initialViewer, mobileApp=false }: { route: string[]; initialViewer?: BantuanViewer; mobileApp?:boolean }) {
  const router=useRouter(),key=route.join("/"),tab=route[0]??"",applicationId=route[1]??"";
  const searchParams=useSearchParams();
  const isNew=tab==="pengajuan"&&["baru","langsung"].includes(applicationId);
  const [viewer,setViewer]=useState<BantuanViewer|null>(initialViewer??null),[staff,setStaff]=useState<BantuanStaff[]>([]);
  const [dashboard,setDashboard]=useState<AidDashboard|null>(null),[pageData,setPage]=useState<AidPage|null>(null),[detail,setDetail]=useState<AidDetail|null>(null);
  const [notifications,setNotifications]=useState<AidNotification[]>([]),[showNotifications,setShowNotifications]=useState(false),[mobile,setMobile]=useState(false);
  const [loading,setLoading]=useState(true),[error,setError]=useState("");
  const [filterState,setFilterState]=useState({tab,filters:{...defaultFilters}}),[pageState,setPageState]=useState({tab,number:1});
  const filters=filterState.tab===tab?filterState.filters:defaultFilters,number=pageState.tab===tab?pageState.number:1;
  const [searchState,setSearchState]=useState({tab,value:""}),[loadedListKey,setLoadedListKey]=useState<string|null>(null);
  useEffect(()=>{const timer=setTimeout(()=>setSearchState({tab,value:filters.search}),250);return()=>clearTimeout(timer);},[tab,filters.search]);
  const serializedFilters=JSON.stringify({...filters,search:searchState.tab===tab?searchState.value:""});
  const [selection,setSelection]=useState<{key:string;ids:Record<string,boolean>}>({key:"",ids:{}}),[batchAction,setBatchAction]=useState(""),[batchBusy,setBatchBusy]=useState(false),[revision,setRevision]=useState(0);
  const [view,setView]=useListView(viewer?.id);
  const listKey=JSON.stringify([key,number,serializedFilters,revision]);
  const page=loadedListKey&&JSON.parse(loadedListKey)[0]===key?pageData:null;
  const selected=selection.key===listKey?selection.ids:{};
  function setSelected(value:Record<string,boolean>|((current:Record<string,boolean>)=>Record<string,boolean>)){setSelection(current=>({key:listKey,ids:typeof value==="function"?value(current.key===listKey?current.ids:{}):value}));}
  function updateFilters(value:ListFilters){setFilterState({tab,filters:value});setPageState({tab,number:1});setError("");setSelected({});setBatchAction("");}
  const listRefreshing=loadedListKey!==listKey&&!error;
  const viewerId=viewer?.id,viewerRole=viewer?.role,viewerRoles=JSON.stringify(viewer?.roles??[]);
  const [menuQuery,setMenuQuery]=useState(""),[loggingOut,setLoggingOut]=useState(false);
  const sidebarRef=useRef<HTMLElement>(null);
  const [batchSuccess,setBatchSuccess]=useState(false);
  const [amounts,setAmounts]=useState<Record<string,string>>({});
  // Refresh data in place. Unmounting detail would discard unsaved form values.
  const reload=useCallback(()=>{setError("");setRevision(v=>v+1);},[setError,setRevision]);
  useEffect(()=>{
    if(!mobileApp)return;
    const open=()=>setMobile(true),pushed=()=>reload();
    window.addEventListener("bantuan-open-menu",open);window.addEventListener("bantuan-push-received",pushed);
    return()=>{window.removeEventListener("bantuan-open-menu",open);window.removeEventListener("bantuan-push-received",pushed);};
  },[mobileApp,reload]);
  useEffect(()=>{
    if(!mobileApp||!mobile)return;
    const previousFocus=document.activeElement as HTMLElement|null;
    const focusable=()=>Array.from(sidebarRef.current?.querySelectorAll<HTMLElement>('a[href],button:not(:disabled),input:not(:disabled),[tabindex="0"]')??[]).filter(node=>node.getClientRects().length>0);
    focusable()[0]?.focus();
    const escape=(event:KeyboardEvent)=>{
      if(document.querySelector('dialog[open]'))return;
      if(event.key==="Escape"){event.preventDefault();setMobile(false);}
      if(event.key==="Tab"){
        const items=focusable(),first=items[0],last=items.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
      }
    };
    window.addEventListener("keydown",escape);
    const previous=document.body.style.overflow;document.body.style.overflow="hidden";
    return()=>{document.body.style.overflow=previous;window.removeEventListener("keydown",escape);if(previousFocus?.isConnected)previousFocus.focus();};
  },[mobileApp,mobile]);
  const finishBatch=useCallback(()=>{setBatchSuccess(false);reload();},[reload]);
  useEffect(()=>{
    let live=true;const controller=new AbortController();
    void Promise.all([request<BantuanViewer>("viewer",{signal:controller.signal}),request<BantuanStaff[]>("staff",{signal:controller.signal}),request<AidDashboard>("dashboard",{signal:controller.signal}),request<AidNotification[]>("notifications",{signal:controller.signal})])
      .then(([who,people,stats,notes])=>{if(live){setViewer(who);setStaff(people);setDashboard(stats);setNotifications(notes);}})
      .catch(err=>{if(live)setError(err instanceof Error?err.message:"Data tidak dapat dimuat.");})
      .finally(()=>{if(live)setLoading(false);});
    return()=>{live=false;controller.abort();};
  },[revision]);
  useEffect(()=>{
    if(!viewerId||!viewerRole||isNew||menuGroups.some(group=>group.key===tab)||["notifikasi","akun","mustahiq","tim","pengaturan","audit","proses","santunan","pengajuan-dana",""].includes(tab))return;
    let live=true;const controller=new AbortController();
    if(tab==="pengajuan"&&applicationId){
      void request<AidDetail>(`applications/${encodeURIComponent(applicationId)}`,{signal:controller.signal})
        .then(row=>{if(live)setDetail(row);}).catch(err=>{if(live)setError(err instanceof Error?err.message:"Pengajuan belum dapat dimuat.");});
    }else{
      const params=applicationParams({role:viewerRole,roles:JSON.parse(viewerRoles)},tab,JSON.parse(serializedFilters),number);
      if(tab==="laporan")params.set("summary","1");
      void request<AidPage>(`applications?${params}`,{signal:controller.signal},false)
        .then(rows=>{if(live){if(!rows.data.length&&rows.total>0&&number>rows.last_page){setPageState({tab,number:rows.last_page});return;}setPage(rows);setLoadedListKey(listKey);}})
        .catch(err=>{if(live)setError(err instanceof Error?err.message:"Daftar pengajuan belum dapat dimuat.");});
    }
    return()=>{live=false;controller.abort();};
  },[viewerId,viewerRole,viewerRoles,tab,applicationId,isNew,number,serializedFilters,revision,listKey]);
  useEffect(()=>{
    if(!viewerId)return;
    let live=true,pending=false;
    const controller=new AbortController();
    async function refreshNotifications(){
      if(pending||document.visibilityState!=="visible")return;
      pending=true;
      try{const notes=await request<AidNotification[]>("notifications",{signal:controller.signal});if(live)setNotifications(notes);}catch{/* Keep the last inbox while offline. */}finally{pending=false;}
    }
    void refreshNotifications();
    const timer=window.setInterval(()=>void refreshNotifications(),15000);
    const onFocus=()=>void refreshNotifications();
    window.addEventListener("focus",onFocus);document.addEventListener("visibilitychange",onFocus);
    return()=>{live=false;controller.abort();window.clearInterval(timer);window.removeEventListener("focus",onFocus);document.removeEventListener("visibilitychange",onFocus);};
  },[viewerId,showNotifications]);
  const [markingAll,setMarkingAll]=useState(false);
  async function markAllRead(){
    if(markingAll)return;
    setMarkingAll(true);
    const visibleIds=new Set(notifications.map(note=>note.id));
    try{const result=await request<{read_at:string}>("notifications/read-all",{method:"PUT"});setNotifications(notes=>notes.map(note=>visibleIds.has(note.id)&&!note.read_at?{...note,read_at:result.read_at}:note));}
    catch(err){setError(err instanceof Error?err.message:"Notifikasi belum dapat ditandai.");}
    finally{setMarkingAll(false);}
  }
  async function markRead(note:AidNotification){try{await request(`notifications/${note.id}/read`,{method:"PUT"});setShowNotifications(false);if(note.application_id)router.push(`/admin/bantuan/pengajuan/${note.application_id}?from=${encodeURIComponent(navTab)}`);reload();}catch(err){setError(String(err));}}
  async function batch(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!page||!batchAction)return;setBatchBusy(true);setError("");const form=new FormData(e.currentTarget);try{
    if(batchAction==="disburse"){const file=form.get("file");if(file instanceof File&&file.size){const {file:prepared,location}=await preparePhotoUpload(file);for(const row of page.data.filter(r=>selected[r.id])){const upload=new FormData();upload.set("kind","transfer");upload.set("file",prepared);appendPhotoLocation(upload,location);await request(`applications/${row.id}/documents`,{method:"POST",body:upload});}}}
    await request("batch",{method:"POST",body:JSON.stringify({action:batchAction,reason:form.get("reason"),reference:form.get("reference"),transferDate:form.get("transferDate"),account:form.get("account"),totalAmount:Number(form.get("totalAmount")),items:page.data.filter(r=>selected[r.id]).map(r=>({id:r.id,version:r.version,amount:Number(amounts[r.id]??r.amount??0),transferAmount:r.amount}))})});setSelected({});setBatchAction("");setBatchSuccess(true);
  }catch(err){setError(err instanceof Error?err.message:"Proses massal gagal.");}finally{setBatchBusy(false);}}
  const canCreate=!!viewer&&(hasAnyRole(viewer,["admin","call_center","requester"])||hasRole(viewer,"verifier")&&viewer.canBypass);
  async function logout(){
    setLoggingOut(true);
    try{
      if(mobileApp){const {disablePwaPush}=await import("../pwa/push-client");await disablePwaPush().catch(()=>undefined);}
      const response=await fetch("/api/auth/logout",{method:"POST"});
      if(!response.ok)throw new Error("Belum berhasil keluar. Coba lagi.");
      if(viewer){try{await clearDrafts(viewer.id);}catch{}clearPhotoMemory(viewer.id);}
      router.replace("/admin/login");router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"Gagal keluar.");setLoggingOut(false);}
  }
  const allLinks=viewer?navigation(viewer):[];
  const links=viewer?sidebarNavigation(viewer):[];
  const origin=tab==="pengajuan"&&applicationId&&!isNew?[...allLinks,...links].find(link=>link.key===searchParams.get("from")):undefined;
  const navTab=origin?.key??tab,navKey=origin?.key??key;
  const activeLink=menuGroups.find(group=>group.key===navTab)??links.find(l=>l.key===navKey)??links.find(l=>l.key===navTab)??allLinks.find(l=>l.key===navTab)??(processInfo(navTab)?links.find(l=>l.key==="proses"):undefined);
  const queue=processInfo(tab);
  const sidebarActiveKey=menuGroups.find(group=>group.key===navTab||allLinks.some(entry=>entry.key===navKey&&entry.group===group.group))?.key??(links.some(link=>link.key===activeLink?.key)?activeLink!.key:queue?"proses":activeLink?.key??"");
  const queueStates=viewer?defaultListStates(viewer,tab):[];
  const newHref="/admin/bantuan/pengajuan/"+(!!viewer&&!hasAnyRole(viewer,["admin","call_center","requester"])&&hasRole(viewer,"verifier")?"langsung":"baru")+"?from="+encodeURIComponent(navTab);
  const listTitle:Record<string,string>={berjalan:"Pengajuan Berjalan",...(queue?{[tab]:queue.label}:{}),pengajuan:!!viewer&&rolesOf(viewer).every(role=>role==="requester")?"Pengajuan saya":"Semua pengajuan",review:"Antrean persetujuan",survei:queue?.label??"Tugas lapangan",dana:"Pengajuan dana",pencairan:queue?.label??"Pencairan & penyaluran",penyaluran:queue?.label??"Penyerahan bantuan",screening:queue?.label??"Antrean screening",laporan:"Laporan bantuan"};
  const isDetail=tab==="pengajuan"&&applicationId&&!isNew;
  const isEdit=isDetail&&route[2]==="edit";
  const selectedRows=page?.data.filter(r=>selected[r.id])??[];
  const batchStates:Record<string,string[]>={approve:["survey_submitted","review2","bypass_review"],fund_submit:["fund_ready"],fund_approve:["fund_submitted"],fund_reject:["fund_submitted"],disburse:["fund_approved"]};
  const batchOptions=viewer?[...(hasAnyRole(viewer,["admin","approver","chair"])?["approve"]:[]),...(hasAnyRole(viewer,["admin","fund_requester"])?["fund_submit","fund_approve","fund_reject"]:[]),...(hasAnyRole(viewer,["admin","treasurer"])&&tab!=="pencairan"?["disburse"]:[])]:[];
  const eligibleBatchOptions=batchOptions.filter(a=>selectedRows.every(r=>batchStates[a].includes(r.status)));
  const report=page?.summary;
  return <div className={`${s.app} ${mobileApp?s.mobileApp:""}`}>
    {batchSuccess&&<ProcessSuccess title="Proses massal berhasil" description="Seluruh pengajuan yang dipilih sudah diproses." onContinue={finishBatch}/>}
    {mobile&&<button className={s.mobileOverlay} aria-label="Tutup navigasi" onClick={()=>setMobile(false)}/>}
    <aside id="bantuan-sidebar" ref={sidebarRef} role={mobileApp&&mobile?"dialog":undefined} aria-modal={mobileApp&&mobile?true:undefined} aria-label="Menu Bantuan" className={s.sidebar} data-open={mobile}><Link href="/admin/bantuan" className={s.brand}><span className={s.brandLabel}>LAZSIP</span><strong>Pengajuan bantuan</strong></Link>
      {viewer&&<SidebarMenu viewer={viewer} dashboard={dashboard} activeKey={tab==="akun"?"akun":sidebarActiveKey} onNavigate={()=>setMobile(false)}/>}
      <div className={s.sidebarHelp}><Icon name="shield"/><div><strong>Ruang kerja internal</strong><p>Data pribadi hanya untuk petugas berwenang.</p></div></div>
      <div className={s.sidebarFooter}><span className={s.avatar}>{viewer?.name.slice(0,2).toUpperCase()??"…"}</span><div style={{minWidth:0}}><strong style={{fontSize:12}}>{viewer?.name??"Memuat akun…"}</strong><div className={s.tiny}>{viewer?roleLabel(viewer):""}</div></div><button className={s.iconButton} aria-label="Keluar dari akun" title="Keluar" onClick={()=>void logout()} disabled={loggingOut}><Icon name="logout"/></button></div>
    </aside>
    <div className={s.body}><header className={s.topbar}><div style={{display:"flex",gap:12,alignItems:"center"}}><button className={`${s.iconButton} ${s.menuButton}`} aria-label="Buka navigasi" onClick={()=>setMobile(true)}><Icon name="menu"/></button><div className={s.breadcrumb}><span>Workspace</span><span>/</span><strong>{tab==="akun"?"Pengaturan akun":origin?.label??queue?.label??activeLink?.label??"Pengajuan"}</strong></div></div><form className={s.menuSearch} onSubmit={e=>{e.preventDefault();const match=allLinks.find(l=>l.label.toLowerCase().includes(menuQuery.trim().toLowerCase()));if(menuQuery.trim()&&match){router.push("/admin/bantuan"+(match.key?"/"+match.key:""));setMenuQuery("");}else if(menuQuery.trim())setError("Menu belum ditemukan. Coba pilih nama menu dari saran pencarian.");}}><Icon name="search"/><input aria-label="Cari menu Bantuan" placeholder="Cari menu..." list="bantuan-menu-suggestions" value={menuQuery} onChange={e=>setMenuQuery(e.target.value)}/><datalist id="bantuan-menu-suggestions">{allLinks.map(link=><option key={link.key} value={link.label}/>)}</datalist></form><div className={s.topActions}>{!mobileApp&&<Link href="/bantuan-app/beranda" className={s.platformButton} title="Aplikasi mobile Bantuan"><Icon name="hand"/><span>Aplikasi mobile</span></Link>}{viewer&&<><HelpButton viewer={viewer}/></>}{viewer&&(viewer.canChooseModules??hasRole(viewer,"admin"))&&<Link href="/admin/modul" className={s.platformButton} title="Pilihan modul"><Icon name="grid"/><span>Pilihan modul</span></Link>}<span className={s.pill}>Internal</span><button className={s.iconButton} aria-label={`Notifikasi, ${notifications.filter(n=>!n.read_at).length} belum dibaca`} aria-expanded={showNotifications} onClick={()=>setShowNotifications(v=>!v)}><Icon name="bell"/>{notifications.some(n=>!n.read_at)&&<span className={s.notificationCount}>{notifications.filter(n=>!n.read_at).length}</span>}</button><AccountMenu viewer={viewer} loggingOut={loggingOut} onLogout={()=>void logout()}/></div></header>
    {showNotifications&&<section className={s.popover}><div className={s.cardHeader} style={{padding:"0 0 14px"}}><h2>Notifikasi</h2><button type="button" className={s.link} disabled={markingAll||!notifications.some(n=>!n.read_at)} onClick={()=>void markAllRead()}>{markingAll?"Menandai…":"Tandai semua dibaca"}</button><button className={s.link} onClick={()=>setShowNotifications(false)}>Tutup</button></div>{notifications.length?notifications.map(n=><button key={n.id} className={s.notification} onClick={()=>markRead(n)} style={{fontWeight:n.read_at?400:600}}>{n.message}<small>{day(n.created_at)}</small></button>):<p className={s.tiny}>Belum ada notifikasi baru.</p>}</section>}
    <main className={s.main}>{mobileApp&&viewer&&<PwaPushControl viewerId={viewer.id} showControls={tab==="akun"||tab==="notifikasi"}/>}
    {error&&<div className={`${s.notice} ${s.error}`} role="alert"><span>{error}</span><button aria-label="Tutup pesan" onClick={()=>setError("")}>×</button></div>}
      {!viewer?loading?<LoadingState variant="detail" label="Menyiapkan ruang kerja…"/>:<div className={s.empty}><p>Akses modul belum tersedia. Pastikan Anda mendapat izin dari superadmin.</p><Link className={s.button} href="/admin">Kembali ke platform</Link></div>:
      tab==="notifikasi"&&mobileApp?<PwaNotifications viewer={viewer} onRead={reload} refreshKey={revision}/>:tab==="akun"?<section className={s.accountSettings}>{mobileApp&&<section className={s.pwaAccount} aria-label="Informasi akun"><span className={s.avatar}>{viewer.name.slice(0,2).toUpperCase()}</span><div><h2>{viewer.name}</h2><p>Kode akun: <strong>{viewer.code}</strong></p><p>{roleLabel(viewer)}</p></div><button type="button" className={s.button} disabled={loggingOut} onClick={()=>void logout()}><Icon name="logout"/>{loggingOut?"Sedang keluar…":"Keluar akun"}</button></section>}<div className={s.heading}><div><h1>Pengaturan akun</h1><p>Kelola keamanan akun Anda.</p></div></div>{canManageOwnPasswordInModule(viewer)?<ChangePassword initiallyOpen/>:<div><p>Pengaturan akun dikelola melalui dashboard platform sesuai hak akses Anda.</p><a className={s.button} href="/admin/pengaturan-akun">Buka pengaturan akun platform</a></div>}{mobileApp&&<p>Pasang aplikasi melalui menu browser → Tambahkan ke layar utama. Menu lainnya tersedia melalui tombol navigasi di kiri atas.</p>}</section>:
      tab==="pengajuan-dana"?<FundingRequests viewer={viewer} onChanged={reload}/>:
      isNew?canCreate?<IntakeForm viewer={intakeViewer(viewer,applicationId==="langsung"||detail?.source==="bypass")} direct={applicationId==="langsung"}/>:<div className={s.empty}>Peran ini tidak dapat membuat pengajuan.</div>:
      isDetail?!detail&&!error?<LoadingState variant="detail" label="Memuat detail pengajuan…"/>:detail?isEdit?<IntakeForm viewer={intakeViewer(viewer,applicationId==="langsung"||detail?.source==="bypass")} initial={detail}/>:<Detail origin={origin} key={`${detail.id}:${detail.status}`} row={detail} viewer={viewer} staff={staff} reload={reload}/>:<div className={s.empty}><h3>Pengajuan belum dapat dimuat</h3><button type="button" className={s.button} onClick={reload}>Coba lagi</button></div>:
      tab===""?<Dashboard viewer={viewer} dashboard={dashboard} failed={!!error} onRetry={reload}/>:
      tab==="mustahiq"?<Mustahiq key={key} id={route[1]}/>:
      menuGroups.some(group=>group.key===tab)?<MenuGroup view={tab} viewer={viewer} dashboard={dashboard}/>:
      tab==="proses"?<ProcessHub viewer={viewer} dashboard={dashboard} failed={!!error} onRetry={reload}/>:
      tab==="santunan"?<Santunan viewer={viewer} staff={staff}/>:
      ["tim","pengaturan","audit"].includes(tab)?<Management tab={tab} viewer={viewer} staff={staff} reload={reload} loading={loading}/>:
      <><div className={s.heading}><div>{queue&&<Link className={s.backLink} href="/admin/bantuan/proses"><Icon name="back"/>Semua proses</Link>}<div className={s.eyebrow}>{tab?"OPERASIONAL BANTUAN":"SELAMAT DATANG KEMBALI"}</div><h1>{tab?listTitle[tab]??"Pengajuan bantuan":`Ringkasan bantuan`}</h1><p>{queue?.description??(tab==="dana"?"Penanda manual dari web pengajuan dana. Tidak ada transfer otomatis.":tab==="pencairan"?"Pantau dana siap cair dan bukti penyerahan yang belum lengkap.":"Pantau setiap tahap, pastikan bantuan sampai kepada yang membutuhkan.")}</p></div><div className={s.actions}>{tab==="laporan"&&hasAnyRole(viewer,["admin","call_center"])&&<ReportExport query={applicationParams(viewer,tab,filters)} description={reportFilterDescription(filters,Object.fromEntries([...staff.map(person=>[person.id,person.name]),[viewer.id,viewer.name]]))}/>}{tab==="laporan"&&hasAnyRole(viewer,["admin","approver","chair","fund_requester","treasurer"])&&<a className={`${s.button} ${s.secondary}`} href={`/api/bantuan/export?${applicationParams(viewer,tab,filters)}`}>↓ Ekspor hasil filter</a>}{canCreate&&<Link className={s.button} href={newHref}><Icon name="plus"/>Pengajuan baru</Link>}</div></div>
      <PageGuide title={tab==="laporan"?"Cara membaca laporan bantuan":"Cara mengerjakan daftar ini"} steps={tab==="laporan"?["Ringkasan menampilkan nominal yang ditetapkan, dicairkan, dan diserahkan.","Gunakan pencarian dan filter untuk menemukan pengajuan tertentu.","Buka pengajuan untuk melihat dokumen dan riwayat. Ekspor CSV tersedia sesuai peran."]:["Cari nama atau nomor pengajuan; gunakan filter jika diperlukan.",queue?.description??"Buka pengajuan untuk melihat data, status, dan langkah berikutnya.","Di halaman detail, periksa data lalu pilih tombol langkah berikutnya atau tab Tindakan."]}/>
      {report&&tab==="laporan"&&<><div className={`${s.stats} ${tab?s.compactStats:""}`}>{[
        {label:"Total pengajuan",value:report.total,hint:"Sesuai filter laporan",icon:"file"},
        {label:"Menunggu persetujuan",value:["review1","survey_submitted","review2","bypass_review"].reduce((a,k)=>a+Number(report.byStatus[k]??0),0),hint:"Review tahap 1, 2 & jalur langsung",icon:"clock"},
        {label:"Siap disalurkan",value:report.byStatus.disbursed??0,hint:"Dana sudah berada di penyalur",icon:"wallet"},
        {label:"Bantuan selesai",value:report.byStatus.completed??0,hint:"Bukti penyerahan sudah lengkap",icon:"check"},
      ].map((stat,i)=><div key={stat.label} className={`${s.stat} ${i===3?s.accentCard:""}`}><div className={s.statTop}>{stat.label}<Icon name={stat.icon}/></div><strong>{stat.value}</strong><p>{stat.hint}</p></div>)}</div>
      {report.overdue>0&&<div className={s.notice}>{report.overdue} pengajuan melewati batas penyaluran {viewer.settings.distributionDays} hari. Mohon segera lengkapi bukti penyerahan.<Link className={s.link} href={allLinks.some(link=>link.key==="penyaluran")?"/admin/bantuan/penyaluran":"/admin/bantuan/pengajuan"}>Tinjau →</Link></div>}
      {tab==="laporan"&&<div className={s.split}><section className={s.card}><div className={s.cardHeader}><div><h2>Perjalanan bantuan</h2><p>Ringkasan sesuai filter daftar di bawah</p></div><span className={s.pill}>Hasil filter</span></div><div className={s.cardBody}>{[["Proses screening",["draft","screening","needs_data"]],["Review & survei",["review1","survey_assignment","survey_assigned","survey_cc_review","survey_submitted","review2","bypass_review"]],["Proses dana",["approved","fund_ready","fund_submitted","fund_approved"]],["Penyaluran",["disbursed"]],["Selesai",["completed"]]].map(([label,keys])=>{const count=(keys as string[]).reduce((a,k)=>a+Number(report.byStatus[k]??0),0);return <div key={String(label)}><div className={s.progressRow}><span>{label}</span><strong>{count}</strong></div><div className={s.progress}><span style={{width:`${report.total?count/report.total*100:0}%`}}/></div></div>;})}</div></section>
      <section className={s.card}><div className={s.cardHeader}><div><h2>Ringkasan dana</h2><p>Nominal sesuai filter laporan</p></div></div><div className={s.cardBody}>{[["Bantuan ditetapkan",report.approvedAmount],["Dana dicairkan",report.disbursedAmount],["Bantuan tersalurkan",report.completedAmount]].map(([label,value])=><div className={s.document} key={String(label)} style={{alignItems:"flex-start",flexDirection:"column",gap:5}}><span className={s.tiny}>{label}</span><strong style={{fontSize:21,fontWeight:600}}>{money(Number(value))}</strong></div>)}<p className={s.tiny} style={{marginTop:18}}>Bukan saldo rekening. Pencairan dilakukan manual oleh Bendahara.</p></div></section></div>}
      </>}
      {dashboard&&tab==="pencairan"&&hasAnyRole(viewer,["admin","treasurer"])&&dashboard.tickets.length>0&&<DisbursementGroups tickets={dashboard.tickets} staff={staff} onSaved={()=>{reload();setBatchSuccess(true);}}/>}
      <section className={s.card}><div className={s.cardHeader}><div><h2>{tab?listTitle[tab]:"Pengajuan terbaru"}</h2><p>{error?page?"Hasil sebelumnya · filter terbaru belum berhasil dimuat":"Daftar belum berhasil dimuat":listRefreshing?page?"Memperbarui hasil pencarian…":"Menyiapkan daftar pengajuan…":page?`${page.total} pengajuan · sesuai filter dan akses Anda`:"Menyiapkan daftar pengajuan…"}</p></div>{listRefreshing&&<span className={s.tiny} role="status">Memperbarui daftar…</span>}</div>
        <ApplicationFilters filters={filters} onChange={updateFilters} viewer={viewer} staff={staff} programs={[...new Set([...viewer.settings.programs,...page?.filterOptions?.programs??[]])]} regions={page?.filterOptions?.regions??viewer.settings.regions} states={queueStates} view={view} onViewChange={setView}/>
        {(!page||page.data.length===0)&&(loading||listRefreshing)&&!error?<LoadingState label="Memuat daftar pengajuan…"/>:(!page||page.data.length===0)&&error?<div className={s.empty}><h3>Daftar belum berhasil dimuat</h3><p>Periksa koneksi lalu coba lagi. Data belum dapat dipastikan kosong.</p><button type="button" className={s.button} onClick={reload}>Coba lagi</button></div>:page?.data.length?<ApplicationList viewer={viewer} page={page} staff={staff} view={view} selected={selected} onSelect={(id,value)=>setSelected(current=>({...current,[id]:value}))} selectable={batchOptions.length>0} canSelect={row=>batchOptions.some(action=>batchStates[action].includes(row.status))} refreshing={listRefreshing} number={number} onPageChange={value=>setPageState({tab,number:value})} perPage={filters.perPage} onPerPageChange={value=>updateFilters({...filters,perPage:value})}/>:<div className={s.empty}><div className={s.avatar} style={{margin:"0 auto 15px"}}><Icon name="inbox"/></div><h3>{activeFilterChips(filters).length?"Tidak ada pengajuan yang cocok":queue?"Antrean tahap ini kosong":"Belum ada pengajuan di sini"}</h3><p>{activeFilterChips(filters).length?"Coba kata pencarian lain atau reset filter untuk melihat daftar semula.":"Pengajuan akan tampil sesuai tahap dan akses akun Anda."}</p>{activeFilterChips(filters).length>0&&<button type="button" className={`${s.button} ${s.secondary}`} onClick={()=>updateFilters({...defaultFilters})}>Bersihkan filter</button>}{queue?<Link className={`${s.button} ${s.secondary}`} href="/admin/bantuan/pengajuan">Lihat semua pengajuan</Link>:canCreate&&<Link className={`${s.button} ${s.secondary}`} href={newHref}>Buat pengajuan baru</Link>}</div>}
      </section>
      {selectedRows.length>0&&<section className={s.card}><div className={s.cardHeader}><h2>{selectedRows.length} pengajuan dipilih</h2><span className={s.tiny}>Diproses sekaligus; seluruh item harus valid</span></div><form onSubmit={batch} className={s.cardBody}><div className={s.formGrid}><label className={s.field}>Tindakan massal<select className={s.input} required value={batchAction} onChange={e=>setBatchAction(e.target.value)}><option value="">Pilih tindakan</option>{eligibleBatchOptions.map(a=><option key={a} value={a}>{{approve:"Setujui & tetapkan nominal",fund_submit:"Dana diajukan",fund_approve:"Dana disetujui",fund_reject:"Dana ditolak",disburse:"Catat transfer per Verifikator"}[a]}</option>)}</select></label>
        {batchAction==="fund_submit"&&<label className={s.field}>Referensi web dana<input className={s.input} name="reference"/></label>}{batchAction==="fund_reject"&&<label className={s.field}>Alasan penolakan *<textarea className={s.input} required minLength={5} name="reason"/></label>}
        {batchAction==="disburse"&&<><label className={s.field}>Tanggal transfer *<input className={s.input} name="transferDate" type="date" required/></label><label className={s.field}>Rekening tujuan *<input className={s.input} name="account" required/></label><label className={s.field}>Total ditransfer (Rp) *<input className={s.input} name="totalAmount" type="number" required min={1} defaultValue={selectedRows.reduce((sum,r)=>sum+(r.amount??0),0)}/><small>Pilih penerima dari satu Verifikator yang sama.</small></label><label className={s.upload}>Bukti transfer (opsional)<input type="file" name="file" accept={attachmentAccept}/></label></>}
        {batchAction==="approve"&&selectedRows.map(r=><label className={s.field} key={r.id}>{r.name} · nominal (Rp)<input className={s.input} type="number" min={1} required value={amounts[r.id]??r.amount??""} onChange={e=>setAmounts(v=>({...v,[r.id]:e.target.value}))}/></label>)}</div><button className={s.button} style={{marginTop:20}} disabled={batchBusy||!batchAction}>{batchBusy?"Memproses…":"Konfirmasi tindakan massal"}</button></form></section>}
      </>}
    </main></div>
  </div>;
}

function Detail({ row,viewer,staff,reload,origin }: {origin?:{key:string;label:string};row:AidDetail;viewer:BantuanViewer;staff:BantuanStaff[];reload:()=>void}) {
  const requestedAction=useSearchParams().get("action");
  const directHandover=["certificate","handover"].includes(requestedAction??"")&&getAvailableActions(row,viewer).some(action=>action.key==="handover");
  const [todayTime]=useState(()=>Date.now());
  const isSurveyReview=row.status==="survey_cc_review";
  const canReviewSurvey=getAvailableActions(row,viewer).some(action=>action.key==="survey_review_submit");
  const hasHandoverReport=row.status==="completed"||!!row.handover;
  const [section,setSection]=useState(requestedAction==="report"&&hasHandoverReport?"penyerahan":isSurveyReview||directHandover?"tindakan":"pemohon");
  const isSurveyEntry=hasRole(viewer,"verifier")&&row.verifierId===viewer.id&&row.status==="survey_assigned";
  const detailTabs=[{id:"pemohon",label:row.intakeType==="other"?"Data pelapor":"Data pemohon"},{id:"dokumen",label:"Dokumen pendukung"},{id:"tindakan",label:getActionSectionLabel(row,viewer)},...(hasHandoverReport?[{id:"penyerahan",label:"Laporan penyerahan"}]:[]),{id:"riwayat",label:"Riwayat"}];
  const upcoming=nextStep(row.status,row.source,row.intakeRole,row.intakeType);
  const canAct=getAvailableActions(row,viewer).length>0;
  const openHandoverReport=()=>{setSection("penyerahan");requestAnimationFrame(()=>{const tab=document.getElementById("case-tab-penyerahan");tab?.scrollIntoView({behavior:"smooth",block:"center"});tab?.focus({preventScroll:true});});};
  const openActions=()=>{setSection("tindakan");requestAnimationFrame(()=>document.getElementById("case-tab-tindakan")?.scrollIntoView({behavior:"smooth",block:"start"}));};
  const person=(id:string|null)=>staff.find(p=>p.id===id)?.name??"Belum ditugaskan";
  const labels:Record<string,string>={otherCategory:"Jenis kebutuhan",bank:"Bank tujuan",recipientName:"Penerima transfer",recipientRelationship:"Hubungan penerima",transferAmount:"Nominal transfer",transferDate:"Tanggal transfer",account:"Rekening tujuan",reporterName:"Nama pelapor",reporterRelationship:"Hubungan pelapor",reporterOrganization:"Lembaga pelapor",reporterAddress:"Alamat pelapor",reporterPhone:"HP pelapor",reporterProgram:"Program dari pelapor",province:"Provinsi",rentPeriod:"Periode sewa",requestCategory:"Bentuk kebutuhan",customTitle:"Kegiatan / kebutuhan",customBeneficiaries:"Sasaran penerima",customLocation:"Lokasi kegiatan",customBudget:"Rincian biaya",customSchedule:"Waktu & frekuensi",customOutcome:"Hasil yang diharapkan",bypassKnowledge:"Dasar mengenal kondisi pemohon",bypassCondition:"Kondisi keluarga & kesehatan",bypassHome:"Kondisi tempat tinggal",bypassExpenses:"Pengeluaran & beban keuangan",bypassEfforts:"Upaya yang sudah dilakukan",bypassNeeds:"Rincian kebutuhan bantuan",bypassRecommendation:"Rekomendasi & urgensi bantuan",intakeType:"Jenis pengajuan",name:"Nama lengkap",nik:"NIK",birthPlace:"Tempat lahir",birthDate:"Tanggal lahir",gender:"Jenis kelamin",maritalStatus:"Status pernikahan",street:"Alamat",rtRw:"RT / RW",village:"Desa / kelurahan",district:"Kecamatan",city:"Kabupaten / kota",housing:"Status tempat tinggal",rent:"Biaya sewa",job:"Pekerjaan",phone:"Nomor HP",income:"Penghasilan",incomePeriod:"Periode penghasilan",dependentCount:"Jumlah tanggungan",dependents:"Rincian tanggungan",prayer:"Sholat 5 waktu",smoking:"Merokok",previousAid:"Pernah dibantu",previousAidNotes:"Bantuan sebelumnya",publicationConsent:"Persetujuan publikasi",willingSktm:"Bersedia mengurus SKTM",informationSource:"Sumber informasi",problem:"Masalah yang dihadapi",applicationNotes:"Catatan tambahan pengajuan",sunnahKnowledge:"Apakah sudah mengenal sunnah?",date:"Tanggal laporan",type:"Jenis pelapor",address:"Alamat",background:"Latar belakang",currentCondition:"Kondisi saat ini",needs:"Kebutuhan",efforts:"Upaya yang dilakukan",homeObservation:"Kondisi rumah",socialRecord:"Kondisi sosial",recommendation:"Rekomendasi",notes:"Catatan",suggestions:"Kritik & saran",hasSktm:"Memiliki SKTM",sktmExplanation:"Penjelasan SKTM",stayDuration:"Lama tinggal",stayUnit:"Satuan",method:"Metode penyerahan",amount:"Nominal diserahkan",differenceReason:"Alasan selisih nominal"};
  const renderData=(data:Record<string,unknown>)=><dl className={s.infoGrid}>{Object.entries(data).map(([k,v])=>["latitude","longitude","contacts","provinceId","cityId","districtId","villageId"].includes(k)?null:<div key={k} className={["problem","applicationNotes"].includes(k)?s.infoNarrative:undefined}><dt>{labels[k]??(k.startsWith("assessment_")?"Penilaian awal: "+(labels[k.slice(11)]??k.slice(11)):k)}</dt><dd>{k==="intakeType"?(v==="other"?"Pengajuan lainnya":v==="returning"?"Pemohon pernah mengajukan":"Pemohon baru"):k==="dependents"?<DependentsSummary value={v}/>:k==="rent"?(v===null||v===undefined||v===""?"Belum diisi":money(Number(v))):typeof v==="boolean"?(v?"Ya":"Tidak"):String(v??"—").replaceAll("_"," ")}</dd></div>)}</dl>;
  return <><Link href={origin?"/admin/bantuan/"+origin.key:"/admin/bantuan/pengajuan"} className={s.link}>← {origin?.label??"Semua pengajuan"}</Link><div className={s.heading} style={{marginTop:20}}><div><div className={s.eyebrow}>{row.number} · {row.source==="bypass"?"JALUR LANGSUNG":row.source==="walk_in"?"WALK-IN":"ONLINE"}</div><h1>{row.name}</h1><p>{row.program} <span style={{padding:"0 7px"}}>·</span> {row.region} <span style={{padding:"0 7px"}}>·</span> {day(row.createdAt)}</p></div><div className={s.actions}><Badge status={row.status}/>{hasHandoverReport&&<button type="button" className={s.button} onClick={openHandoverReport}>Lihat laporan penyerahan</button>}{(hasRole(viewer,"admin")||hasRole(viewer,"call_center"))&&<DeleteApplication id={row.id} number={row.number} name={row.name} version={row.version}/ >}{canEditIntake(viewer,row)&&<Link className={`${s.button} ${s.secondary}`} href={`/admin/bantuan/pengajuan/${row.id}/edit${origin?"?from="+encodeURIComponent(origin.key):""}`}>Edit data</Link>}</div></div>
    {row.status==="survey_assigned"&&!row.surveyDeadline?.overdue&&hasAnyRole(viewer,["admin","call_center"])&&<SurveyReminder key={row.version} row={row} viewer={viewer} assignment/>}<SurveyReminder key={"reminder-"+row.version} row={row} viewer={viewer}/><ApplicantHistory count={row.duplicateCount} applications={row.duplicateApplications??[]}/>
    <DecisionNotice row={row}/>
    {row.status==="survey_assignment"&&[...row.events].reverse().find(event=>event.action==="survey_decline")&&<div className={s.notice}><strong>Tugas survei ditolak Verifikator.</strong><p>{[...row.events].reverse().find(event=>event.action==="survey_decline")?.reason}</p><small>Call Center dapat memilih Verifikator pengganti melalui tab Tindakan.</small></div>}
    {["survey_assignment","survey_assigned"].includes(row.status)&&(hasAnyRole(viewer,["admin","call_center"])||hasRole(viewer,"verifier")&&row.verifierId===viewer.id)&&<SurveyMap row={row} initiallyExpanded={isSurveyEntry} onAddressChange={hasAnyRole(viewer,["admin","call_center"])?async surveyAddress=>{await request(`applications/${row.id}/actions/survey_address`,{method:"POST",body:JSON.stringify({surveyAddress,version:row.version})});reload();}:undefined} editable={hasAnyRole(viewer,["admin","call_center"])||hasRole(viewer,"verifier")&&row.verifierId===viewer.id} onDestination={async point=>{await request(`applications/${row.id}/actions/survey_location`,{method:"POST",body:JSON.stringify({...point,version:row.version})});reload();}}/>}
    {row.bypassReason&&<div className={s.notice}>Alasan jalur langsung: {row.bypassReason}</div>}
    <div className={s.caseSummary}>
      <div><small>Nominal bantuan</small><strong>{row.amount?money(row.amount):"Belum ditetapkan"}</strong></div>
      <div><small>Verifikator</small><strong>{row.manualVerifierName??person(row.verifierId)}</strong></div>
      <div><small>Penyalur</small><strong>{row.manualDistributorName??(row.distributionType==="direct"?"Bendahara langsung":person(row.distributorId))}</strong></div>
      <div><small>{row.disbursedAt?"Dana dicairkan":"Referensi dana"}</small><strong>{row.disbursedAt?day(row.disbursedAt):row.fundReference??"Belum ada"}</strong></div>
    </div>
    <section className={s.nextStep} aria-label="Langkah berikutnya"><span className={s.nextStepIcon}><Icon name="arrow"/></span><div><small>LANGKAH BERIKUTNYA</small><h2>{upcoming.title}</h2><p>{upcoming.description}</p></div><span className={s.nextOwner}>{upcoming.owner}</span>{canAct&&<button type="button" className={s.button} onClick={openActions}>{canReviewSurvey?"Periksa & koreksi hasil survei":isSurveyEntry?"Isi hasil survei":"Buka langkah berikutnya"}<Icon name="arrow"/></button>}</section>
    <PageGuide title="Cara menyelesaikan tahap pengajuan ini" steps={["Periksa Data pemohon dan Dokumen pendukung terlebih dahulu.",canAct?"Tekan Buka langkah berikutnya untuk menuju form tindakan Anda.":`Tahap ini menunggu ${upcoming.owner}. Anda dapat memantau perkembangan melalui Riwayat.`,"Isi form yang tersedia, lalu konfirmasi. Setelah berhasil, Anda kembali ke daftar pengajuan."]}/>
    <div className={s.caseWorkspace}>
      <div className={s.caseTabs} role="tablist" aria-label="Bagian pengajuan">{detailTabs.map(item=><button type="button" key={item.id} role="tab" id={"case-tab-"+item.id} aria-controls={"case-panel-"+item.id} aria-selected={section===item.id} onClick={()=>setSection(item.id)} onKeyDown={e=>{
        if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;
        e.preventDefault();const i=detailTabs.findIndex(t=>t.id===item.id),index=e.key==="Home"?0:e.key==="End"?detailTabs.length-1:(i+(e.key==="ArrowRight"?1:-1)+detailTabs.length)%detailTabs.length;
        setSection(detailTabs[index].id);document.getElementById("case-tab-"+detailTabs[index].id)?.focus();
      }} tabIndex={section===item.id?0:-1}>{item.label}</button>)}</div>
      {/* Keep every panel mounted: switching tabs or uploading must retain drafts. */}
      <div role="tabpanel" id="case-panel-tindakan" aria-labelledby="case-tab-tindakan" hidden={section!=="tindakan"} className={s.casePanel}>
        {hasRole(viewer,"admin")&&<AdminCorrection key={`${row.id}:${row.version}`} row={row} staff={staff} reload={reload}/>}
        <ActionPanel initialAction={directHandover?requestedAction:undefined} key={`${row.id}:${row.status}:${requestedAction}`} row={row} viewer={viewer} staff={staff} reload={reload}/>
        {row.survey&&!isSurveyEntry&&!canReviewSurvey&&<section className={s.card}><div className={s.cardHeader}><h2>Hasil verifikasi</h2></div><div className={s.cardBody}>{renderData({housing:row.applicant.housing??"Belum diisi",rent:row.applicant.rent??null,rentPeriod:row.applicant.rentPeriod??"Belum diisi",dependentCount:row.applicant.dependentCount??0,dependents:row.applicant.dependents??[]})}<h3 className={s.sectionTitle} style={{marginTop:20}}>Hasil kunjungan</h3>{renderData(row.survey)}{Array.isArray(row.survey.contacts)&&row.survey.contacts.length>0&&<><h3 className={s.sectionTitle} style={{marginTop:20}}>Kontak kerabat / tetangga</h3>{(row.survey.contacts as {name:string;relationship:string;phone:string}[]).map((c,i)=><p key={i}>{c.name} · {c.relationship} · {c.phone}</p>)}</>}</div></section>}
        {row.intakeType==="other"&&row.manualProcess?.transferRecipient&&<section className={s.card}><div className={s.cardHeader}><h2>Transfer kepada penyalur</h2></div><div className={s.cardBody}>{renderData(row.manualProcess.transferRecipient)}</div></section>}
        {hasHandoverReport&&<button type="button" className={`${s.button} ${s.secondary}`} onClick={openHandoverReport}>Lihat laporan penyerahan</button>}
        <div className={s.caseShortcuts}><button type="button" onClick={()=>setSection("dokumen")}><Icon name="upload"/> Unggah / lihat dokumen <Icon name="arrow"/></button><button type="button" onClick={()=>setSection("riwayat")}><Icon name="history"/> Lihat riwayat proses <Icon name="arrow"/></button></div>
      </div>
      <div role="tabpanel" id="case-panel-pemohon" aria-labelledby="case-tab-pemohon" hidden={section!=="pemohon"} className={s.casePanel}><section className={s.card}><div className={s.cardHeader}><h2>{row.intakeType==="other"?"Data pelapor & keperluan":"Data pemohon"}</h2><span className={s.pill}>Privat</span></div><div className={s.cardBody}>{renderData(row.applicant)}<div className={s.actions} style={{marginTop:20}}>{typeof row.applicant.income==="number"&&<span className={s.pill}>Estimasi bulanan: {money(row.applicant.income*(row.applicant.incomePeriod==="hari"?30:row.applicant.incomePeriod==="pekan"?52/12:1))}</span>}{typeof row.applicant.birthDate==="string"&&<span className={s.pill}>Usia {Math.max(0,Math.floor((todayTime-new Date(row.applicant.birthDate).getTime())/31557600000))} tahun</span>}{row.applicant.street&&<a className={s.link} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([row.applicant.street,row.applicant.village,row.applicant.district,row.applicant.city].join(", "))}`} target="_blank" rel="noreferrer">Buka peta ↗</a>}</div></div></section></div>
      <div role="tabpanel" id="case-panel-dokumen" aria-labelledby="case-tab-dokumen" hidden={section!=="dokumen"} className={s.casePanel}><DocumentUpload row={row} viewer={viewer} reload={reload}/></div>
      {hasHandoverReport&&<div role="tabpanel" id="case-panel-penyerahan" aria-labelledby="case-tab-penyerahan" hidden={section!=="penyerahan"} className={s.casePanel}><HandoverReport row={row} owner={viewer.id} staff={staff}/></div>}
      <div role="tabpanel" id="case-panel-riwayat" aria-labelledby="case-tab-riwayat" hidden={section!=="riwayat"} className={s.casePanel}><section className={s.card}><div className={s.cardHeader}><h2>Riwayat proses</h2><span className={s.tiny}>{row.events.length} aktivitas</span></div><div className={s.historyScroll}><div className={s.timeline}>{[...row.events].reverse().map(e=><div className={s.event} key={e.id}><strong>{bantuanActionLabels[e.action]??e.action.replaceAll("_"," ")}</strong><p>{e.actorName??"Petugas"} · {bantuanRoles[e.actor_role]??e.actor_role} · {new Date(e.created_at).toLocaleString("id-ID")}</p>{e.to_status&&<Badge status={e.to_status}/>} {e.reason&&<p>{e.reason}</p>}{["admin_correct","revise_amount"].includes(e.action)&&e.previousAmount!==e.amount&&<p>Nominal: {money(e.previousAmount)} → {money(e.amount)}</p>}{e.manual&&<div className={s.notice}><strong>Proses manual · {e.manual.name}</strong><p>Dilaksanakan {e.manual.date} · Sumber: {e.manual.channel=== "other"?"Laporan lainnya":e.manual.channel}</p><p>Dicatat oleh {e.manual.recordedByName??e.actorName}. {e.manual.note}</p></div>}</div>)}</div></div></section></div>
    </div></>;
}
