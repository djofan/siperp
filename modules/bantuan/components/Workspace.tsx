"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { bantuanRoles, bantuanStatuses, bantuanActionLabels } from "@/contracts/modules/bantuan";
import type { AidDashboard, AidDetail, AidNotification, AidPage, BantuanStaff, BantuanViewer } from "@/contracts/modules/bantuan";
import { day, money, request } from "../api/client";
import { preparePhoto } from "../api/photos";
import { navigation, sidebarNavigation, defaultListStates, processInfo, nextStep } from "../policy";
import { IntakeForm } from "./IntakeForm";
import { DependentsSummary } from "./Dependents";
import { ActionPanel, DocumentUpload } from "./ActionPanel";
import { Management } from "./Management";
import { ProcessHub } from "./ProcessHub";
import { Dashboard } from "./Dashboard";
import { ProcessSuccess } from "./ProcessSuccess";
import { Santunan } from "./Santunan";
import { RoleSwitcher } from "./RoleSwitcher";
import { PageGuide } from "./PageGuide";
import { HelpButton } from "./HelpButton";
import { LoadingState } from "./LoadingState";
import { getAvailableActions } from "./ActionPanel";
import { ApplicantHistory } from "./ApplicantHistory";
import { ApplicationFilters } from "./ApplicationFilters";
import { ApplicationList } from "./ApplicationList";
import { SidebarMenu } from "./SidebarMenu";
import { activeFilterChips, applicationParams, defaultFilters, type ListFilters } from "../list-filters";
import { Icon } from "./ui";
import { clearDrafts } from "../api/vault";
import { clearPhotoMemory } from "../api/photo-queue";
import s from "./Workspace.module.css";

export function Badge({ status }: { status: string }) {
  const tone=status==="completed"?s.green:status.startsWith("rejected")||["cancelled","delivery_failed"].includes(status)?s.red:["review1","survey_submitted","bypass_review","review2","fund_submitted"].includes(status)?s.amber:["survey_assigned","disbursed"].includes(status)?s.blue:"";
  return <span className={`${s.badge} ${tone}`}>{bantuanStatuses[status]??status}</span>;
}
export function Workspace({ route, initialViewer }: { route: string[]; initialViewer?: BantuanViewer }) {
  const router=useRouter(),key=route.join("/"),tab=route[0]??"",applicationId=route[1]??"";
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
  const [view,setView]=useState<"cards"|"table">("cards");
  const listKey=JSON.stringify([key,number,serializedFilters,revision]);
  const page=loadedListKey&&JSON.parse(loadedListKey)[0]===key?pageData:null;
  const selected=selection.key===listKey?selection.ids:{};
  function setSelected(value:Record<string,boolean>|((current:Record<string,boolean>)=>Record<string,boolean>)){setSelection(current=>({key:listKey,ids:typeof value==="function"?value(current.key===listKey?current.ids:{}):value}));}
  function updateFilters(value:ListFilters){setFilterState({tab,filters:value});setPageState({tab,number:1});setError("");setSelected({});setBatchAction("");}
  const listRefreshing=loadedListKey!==listKey&&!error;
  const viewerId=viewer?.id,viewerRole=viewer?.role;
  const [menuQuery,setMenuQuery]=useState(""),[loggingOut,setLoggingOut]=useState(false);
  const [batchSuccess,setBatchSuccess]=useState(false);
  const [amounts,setAmounts]=useState<Record<string,string>>({});
  // Refresh data in place. Unmounting detail would discard unsaved form values.
  const reload=useCallback(()=>{setError("");setRevision(v=>v+1);},[setError,setRevision]);
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
    if(!viewerId||!viewerRole||isNew||["tim","pengaturan","audit","proses","santunan",""].includes(tab))return;
    let live=true;const controller=new AbortController();
    if(tab==="pengajuan"&&applicationId){
      void request<AidDetail>(`applications/${encodeURIComponent(applicationId)}`,{signal:controller.signal})
        .then(row=>{if(live)setDetail(row);}).catch(err=>{if(live)setError(err instanceof Error?err.message:"Pengajuan belum dapat dimuat.");});
    }else{
      const params=applicationParams({role:viewerRole},tab,JSON.parse(serializedFilters),number);
      if(tab==="laporan")params.set("summary","1");
      void request<AidPage>(`applications?${params}`,{signal:controller.signal},false)
        .then(rows=>{if(live){if(!rows.data.length&&rows.total>0&&number>rows.last_page){setPageState({tab,number:rows.last_page});return;}setPage(rows);setLoadedListKey(listKey);}})
        .catch(err=>{if(live)setError(err instanceof Error?err.message:"Daftar pengajuan belum dapat dimuat.");});
    }
    return()=>{live=false;controller.abort();};
  },[viewerId,viewerRole,tab,applicationId,isNew,number,serializedFilters,revision,listKey]);
  async function markRead(note:AidNotification){try{await request(`notifications/${note.id}/read`,{method:"PUT"});setShowNotifications(false);router.push(`/admin/bantuan/pengajuan/${note.application_id}`);reload();}catch(err){setError(String(err));}}
  async function batch(e:FormEvent<HTMLFormElement>){e.preventDefault();if(!page||!batchAction)return;setBatchBusy(true);setError("");const form=new FormData(e.currentTarget);try{
    if(batchAction==="disburse"){const file=form.get("file");if(file instanceof File&&file.size){const prepared=await preparePhoto(file);for(const row of page.data.filter(r=>selected[r.id])){const upload=new FormData();upload.set("kind","transfer");upload.set("file",prepared);await request(`applications/${row.id}/documents`,{method:"POST",body:upload});}}}
    await request("batch",{method:"POST",body:JSON.stringify({action:batchAction,reason:form.get("reason"),reference:form.get("reference"),transferDate:form.get("transferDate"),account:form.get("account"),totalAmount:Number(form.get("totalAmount")),items:page.data.filter(r=>selected[r.id]).map(r=>({id:r.id,version:r.version,amount:Number(amounts[r.id]??r.amount??0),transferAmount:r.amount}))})});setSelected({});setBatchAction("");setBatchSuccess(true);
  }catch(err){setError(err instanceof Error?err.message:"Proses massal gagal.");}finally{setBatchBusy(false);}}
  const canCreate=!!viewer&&(["admin","call_center"].includes(viewer.role)||viewer.role==="verifier"&&viewer.canBypass);
  async function logout(){
    setLoggingOut(true);
    try{
      const response=await fetch("/api/auth/logout",{method:"POST"});
      if(!response.ok)throw new Error("Belum berhasil keluar. Coba lagi.");
      if(viewer){try{await clearDrafts(viewer.id);}catch{}clearPhotoMemory(viewer.id);}
      router.replace("/admin/login");router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"Gagal keluar.");setLoggingOut(false);}
  }
  const allLinks=viewer?navigation(viewer):[];
  const links=viewer?sidebarNavigation(viewer):[];
  const activeLink=links.find(l=>l.key===key)??links.find(l=>l.key===tab)??allLinks.find(l=>l.key===tab)??(processInfo(tab)?links.find(l=>l.key==="proses"):undefined);
  const queue=processInfo(tab);
  const sidebarActiveKey=links.some(link=>link.key===activeLink?.key)?activeLink!.key:queue?"proses":activeLink?.key??"";
  const queueStates=viewer?defaultListStates(viewer,tab):[];
  const newHref="/admin/bantuan/pengajuan/"+(viewer?.role==="verifier"?"langsung":"baru");
  const listTitle:Record<string,string>={...(queue?{[tab]:queue.label}:{}),pengajuan:"Semua pengajuan",review:"Antrean persetujuan",survei:queue?.label??"Tugas lapangan",dana:"Pengajuan dana",pencairan:queue?.label??"Pencairan & penyaluran",penyaluran:queue?.label??"Penyerahan bantuan",screening:queue?.label??"Antrean screening",laporan:"Laporan bantuan"};
  const isDetail=tab==="pengajuan"&&applicationId&&!isNew;
  const isEdit=isDetail&&route[2]==="edit";
  const selectedRows=page?.data.filter(r=>selected[r.id])??[];
  const batchStates:Record<string,string[]>={approve:["survey_submitted","review2","bypass_review"],fund_submit:["fund_ready"],fund_approve:["fund_submitted"],fund_reject:["fund_submitted"],disburse:["fund_approved"]};
  const batchOptions=viewer?[...(["admin","approver","chair"].includes(viewer.role)?["approve"]:[]),...(["admin","fund_requester"].includes(viewer.role)?["fund_submit","fund_approve","fund_reject"]:[]),...(["admin","treasurer"].includes(viewer.role)?["disburse"]:[])]:[];
  const eligibleBatchOptions=batchOptions.filter(a=>selectedRows.every(r=>batchStates[a].includes(r.status)));
  const report=page?.summary;
  return <div className={s.app}>
    {batchSuccess&&<ProcessSuccess title="Proses massal berhasil" description="Seluruh pengajuan yang dipilih sudah diproses." onContinue={finishBatch}/>}
    {mobile&&<button className={s.mobileOverlay} aria-label="Tutup navigasi" onClick={()=>setMobile(false)}/>}
    <aside className={s.sidebar} data-open={mobile}><Link href="/admin/bantuan" className={s.brand}><span className={s.brandLabel}>LAZSIP</span><strong>Pengajuan bantuan</strong></Link>
      {viewer&&<SidebarMenu viewer={viewer} dashboard={dashboard} activeKey={sidebarActiveKey} onNavigate={()=>setMobile(false)}/>}
      <div className={s.sidebarHelp}><Icon name="shield"/><div><strong>Ruang kerja internal</strong><p>Data pribadi hanya untuk petugas berwenang.</p></div></div>
      <div className={s.sidebarFooter}><span className={s.avatar}>{viewer?.name.slice(0,2).toUpperCase()??"…"}</span><div style={{minWidth:0}}><strong style={{fontSize:12}}>{viewer?.name??"Memuat akun…"}</strong><div className={s.tiny}>{bantuanRoles[viewer?.role??""]??""}</div></div><button className={s.iconButton} aria-label="Keluar dari akun" title="Keluar" onClick={()=>void logout()} disabled={loggingOut}><Icon name="logout"/></button></div>
    </aside>
    <div className={s.body}><header className={s.topbar}><div style={{display:"flex",gap:12,alignItems:"center"}}><button className={`${s.iconButton} ${s.menuButton}`} aria-label="Buka navigasi" onClick={()=>setMobile(true)}><Icon name="menu"/></button><div className={s.breadcrumb}><span>Workspace</span><span>/</span><strong>{queue?.label??activeLink?.label??"Pengajuan"}</strong></div></div><form className={s.menuSearch} onSubmit={e=>{e.preventDefault();const match=allLinks.find(l=>l.label.toLowerCase().includes(menuQuery.trim().toLowerCase()));if(menuQuery.trim()&&match){router.push("/admin/bantuan"+(match.key?"/"+match.key:""));setMenuQuery("");}else if(menuQuery.trim())setError("Menu belum ditemukan. Coba pilih nama menu dari saran pencarian.");}}><Icon name="search"/><input aria-label="Cari menu Bantuan" placeholder="Cari menu..." list="bantuan-menu-suggestions" value={menuQuery} onChange={e=>setMenuQuery(e.target.value)}/><datalist id="bantuan-menu-suggestions">{allLinks.map(link=><option key={link.key} value={link.label}/>)}</datalist></form><div className={s.topActions}>{viewer&&<><HelpButton viewer={viewer}/><RoleSwitcher viewer={viewer}/></>}<Link href="/admin" className={s.platformButton} title="Pilihan modul"><Icon name="grid"/><span>Pilihan modul</span></Link><span className={s.pill}>Internal</span><button className={s.iconButton} aria-label="Notifikasi" aria-expanded={showNotifications} onClick={()=>setShowNotifications(v=>!v)}><Icon name="bell"/>{notifications.some(n=>!n.read_at)&&<span className={s.dot}/>}</button><div className={s.topProfile}><span className={s.avatar}>{viewer?.name.slice(0,1)??"S"}</span><div><strong>{viewer?.name}</strong><small>{bantuanRoles[viewer?.role??""]}</small></div></div></div></header>
    {showNotifications&&<section className={s.popover}><div className={s.cardHeader} style={{padding:"0 0 14px"}}><h2>Notifikasi</h2><button className={s.link} onClick={()=>setShowNotifications(false)}>Tutup</button></div>{notifications.length?notifications.map(n=><button key={n.id} className={s.notification} onClick={()=>markRead(n)} style={{fontWeight:n.read_at?400:600}}>{n.message}<small>{day(n.created_at)}</small></button>):<p className={s.tiny}>Belum ada notifikasi baru.</p>}</section>}
    <main className={s.main}>{error&&<div className={`${s.notice} ${s.error}`} role="alert"><span>{error}</span><button aria-label="Tutup pesan" onClick={()=>setError("")}>×</button></div>}
      {!viewer?loading?<LoadingState variant="detail" label="Menyiapkan ruang kerja…"/>:<div className={s.empty}><p>Akses modul belum tersedia. Pastikan Anda mendapat izin dari superadmin.</p><Link className={s.button} href="/admin">Kembali ke platform</Link></div>:
      isNew?canCreate?<IntakeForm viewer={viewer} direct={applicationId==="langsung"}/>:<div className={s.empty}>Peran ini tidak dapat membuat pengajuan.</div>:
      isDetail?!detail&&!error?<LoadingState variant="detail" label="Memuat detail pengajuan…"/>:detail?isEdit?<IntakeForm viewer={viewer} initial={detail}/>:<Detail row={detail} viewer={viewer} staff={staff} reload={reload}/>:<div className={s.empty}><h3>Pengajuan belum dapat dimuat</h3><button type="button" className={s.button} onClick={reload}>Coba lagi</button></div>:
      tab===""?<Dashboard viewer={viewer} dashboard={dashboard} failed={!!error} onRetry={reload}/>:
      tab==="proses"?<ProcessHub viewer={viewer} dashboard={dashboard} failed={!!error} onRetry={reload}/>:
      tab==="santunan"?<Santunan viewer={viewer} staff={staff}/>:
      ["tim","pengaturan","audit"].includes(tab)?<Management tab={tab} viewer={viewer} staff={staff} reload={reload} loading={loading}/>:
      <><div className={s.heading}><div>{queue&&<Link className={s.backLink} href="/admin/bantuan/proses"><Icon name="back"/>Semua proses</Link>}<div className={s.eyebrow}>{tab?"OPERASIONAL BANTUAN":"SELAMAT DATANG KEMBALI"}</div><h1>{tab?listTitle[tab]??"Pengajuan bantuan":`Ringkasan bantuan`}</h1><p>{queue?.description??(tab==="dana"?"Penanda manual dari web pengajuan dana. Tidak ada transfer otomatis.":tab==="pencairan"?"Pantau dana siap cair dan bukti penyerahan yang belum lengkap.":"Pantau setiap tahap, pastikan bantuan sampai kepada yang membutuhkan.")}</p></div><div className={s.actions}>{tab==="laporan"&&["admin","approver","chair","fund_requester","treasurer"].includes(viewer.role)&&<a className={`${s.button} ${s.secondary}`} href={`/api/bantuan/export?${applicationParams(viewer,tab,filters)}`}>↓ Ekspor hasil filter</a>}{canCreate&&<Link className={s.button} href={newHref}><Icon name="plus"/>Pengajuan baru</Link>}</div></div>
      <PageGuide title={tab==="laporan"?"Cara membaca laporan bantuan":"Cara mengerjakan daftar ini"} steps={tab==="laporan"?["Ringkasan menampilkan nominal yang ditetapkan, dicairkan, dan diserahkan.","Gunakan pencarian dan filter untuk menemukan pengajuan tertentu.","Buka pengajuan untuk melihat dokumen dan riwayat. Ekspor CSV tersedia sesuai peran."]:["Cari nama atau nomor pengajuan; gunakan filter jika diperlukan.",queue?.description??"Buka pengajuan untuk melihat data, status, dan langkah berikutnya.","Di halaman detail, periksa data lalu pilih tombol langkah berikutnya atau tab Tindakan."]}/>
      {report&&tab==="laporan"&&<><div className={`${s.stats} ${tab?s.compactStats:""}`}>{[
        {label:"Total pengajuan",value:report.total,hint:"Sesuai filter laporan",icon:"file"},
        {label:"Menunggu persetujuan",value:["review1","survey_submitted","review2","bypass_review"].reduce((a,k)=>a+Number(report.byStatus[k]??0),0),hint:"Review tahap 1, 2 & jalur langsung",icon:"clock"},
        {label:"Siap disalurkan",value:report.byStatus.disbursed??0,hint:"Dana sudah berada di penyalur",icon:"wallet"},
        {label:"Bantuan selesai",value:report.byStatus.completed??0,hint:"Bukti penyerahan sudah lengkap",icon:"check"},
      ].map((stat,i)=><div key={stat.label} className={`${s.stat} ${i===3?s.accentCard:""}`}><div className={s.statTop}>{stat.label}<Icon name={stat.icon}/></div><strong>{stat.value}</strong><p>{stat.hint}</p></div>)}</div>
      {report.overdue>0&&<div className={s.notice}>{report.overdue} pengajuan melewati batas penyaluran {viewer.settings.distributionDays} hari. Mohon segera lengkapi bukti penyerahan.<Link className={s.link} href={allLinks.some(link=>link.key==="penyaluran")?"/admin/bantuan/penyaluran":"/admin/bantuan/pengajuan"}>Tinjau →</Link></div>}
      {tab==="laporan"&&<div className={s.split}><section className={s.card}><div className={s.cardHeader}><div><h2>Perjalanan bantuan</h2><p>Ringkasan sesuai filter daftar di bawah</p></div><span className={s.pill}>Hasil filter</span></div><div className={s.cardBody}>{[["Proses screening",["draft","screening","needs_data"]],["Review & survei",["review1","survey_assignment","survey_assigned","survey_submitted","review2","bypass_review"]],["Proses dana",["approved","fund_ready","fund_submitted","fund_approved"]],["Penyaluran",["disbursed"]],["Selesai",["completed"]]].map(([label,keys])=>{const count=(keys as string[]).reduce((a,k)=>a+Number(report.byStatus[k]??0),0);return <div key={String(label)}><div className={s.progressRow}><span>{label}</span><strong>{count}</strong></div><div className={s.progress}><span style={{width:`${report.total?count/report.total*100:0}%`}}/></div></div>;})}</div></section>
      <section className={s.card}><div className={s.cardHeader}><div><h2>Ringkasan dana</h2><p>Nominal sesuai filter laporan</p></div></div><div className={s.cardBody}>{[["Bantuan ditetapkan",report.approvedAmount],["Dana dicairkan",report.disbursedAmount],["Bantuan tersalurkan",report.completedAmount]].map(([label,value])=><div className={s.document} key={String(label)} style={{alignItems:"flex-start",flexDirection:"column",gap:5}}><span className={s.tiny}>{label}</span><strong style={{fontSize:21,fontWeight:600}}>{money(Number(value))}</strong></div>)}<p className={s.tiny} style={{marginTop:18}}>Bukan saldo rekening. Pencairan dilakukan manual oleh Bendahara.</p></div></section></div>}
      </>}
      {dashboard&&tab==="pencairan"&&dashboard.tickets.length>0&&<section className={s.card}><div className={s.cardHeader}><div><h2>Tiket pencairan per penyalur</h2><p>Hanya dana yang telah ditandai disetujui</p></div></div><div className={s.cardBody}>{dashboard.tickets.map((t,i)=><div key={i} className={s.document}><div><strong>{t.distribution_type==="direct"?"Bendahara → penerima langsung":staff.find(p=>p.id===t.distributor_id)?.name??"Verifikator"}</strong><div className={s.tiny}>{t.total} penerima</div></div><strong>{money(Number(t.amount))}</strong></div>)}</div></section>}
      <section className={s.card}><div className={s.cardHeader}><div><h2>{tab?listTitle[tab]:"Pengajuan terbaru"}</h2><p>{error?page?"Hasil sebelumnya · filter terbaru belum berhasil dimuat":"Daftar belum berhasil dimuat":listRefreshing?page?"Memperbarui hasil pencarian…":"Menyiapkan daftar pengajuan…":page?`${page.total} pengajuan · sesuai filter dan akses Anda`:"Menyiapkan daftar pengajuan…"}</p></div>{listRefreshing&&<span className={s.tiny} role="status">Memperbarui daftar…</span>}</div>
        <ApplicationFilters filters={filters} onChange={updateFilters} viewer={viewer} staff={staff} programs={[...new Set([...viewer.settings.programs,...page?.filterOptions?.programs??[]])]} regions={page?.filterOptions?.regions??viewer.settings.regions} states={queueStates} view={view} onViewChange={setView}/>
        {(!page||page.data.length===0)&&(loading||listRefreshing)&&!error?<LoadingState label="Memuat daftar pengajuan…"/>:(!page||page.data.length===0)&&error?<div className={s.empty}><h3>Daftar belum berhasil dimuat</h3><p>Periksa koneksi lalu coba lagi. Data belum dapat dipastikan kosong.</p><button type="button" className={s.button} onClick={reload}>Coba lagi</button></div>:page?.data.length?<ApplicationList page={page} staff={staff} view={view} selected={selected} onSelect={(id,value)=>setSelected(current=>({...current,[id]:value}))} selectable={batchOptions.length>0} canSelect={row=>batchOptions.some(action=>batchStates[action].includes(row.status))} refreshing={listRefreshing} number={number} onPageChange={value=>setPageState({tab,number:value})} perPage={filters.perPage} onPerPageChange={value=>updateFilters({...filters,perPage:value})}/>:<div className={s.empty}><div className={s.avatar} style={{margin:"0 auto 15px"}}><Icon name="inbox"/></div><h3>{activeFilterChips(filters).length?"Tidak ada pengajuan yang cocok":queue?"Antrean tahap ini kosong":"Belum ada pengajuan di sini"}</h3><p>{activeFilterChips(filters).length?"Coba kata pencarian lain atau reset filter untuk melihat daftar semula.":"Pengajuan akan tampil sesuai tahap dan akses akun Anda."}</p>{activeFilterChips(filters).length>0&&<button type="button" className={`${s.button} ${s.secondary}`} onClick={()=>updateFilters({...defaultFilters})}>Bersihkan filter</button>}{queue?<Link className={`${s.button} ${s.secondary}`} href="/admin/bantuan/pengajuan">Lihat semua pengajuan</Link>:canCreate&&<Link className={`${s.button} ${s.secondary}`} href={newHref}>Buat pengajuan baru</Link>}</div>}
      </section>
      {selectedRows.length>0&&<section className={s.card}><div className={s.cardHeader}><h2>{selectedRows.length} pengajuan dipilih</h2><span className={s.tiny}>Diproses sekaligus; seluruh item harus valid</span></div><form onSubmit={batch} className={s.cardBody}><div className={s.formGrid}><label className={s.field}>Tindakan massal<select className={s.input} required value={batchAction} onChange={e=>setBatchAction(e.target.value)}><option value="">Pilih tindakan</option>{eligibleBatchOptions.map(a=><option key={a} value={a}>{{approve:"Setujui & tetapkan nominal",fund_submit:"Dana diajukan",fund_approve:"Dana disetujui",fund_reject:"Dana ditolak",disburse:"Catat transfer per Verifikator"}[a]}</option>)}</select></label>
        {batchAction==="fund_submit"&&<label className={s.field}>Referensi web dana<input className={s.input} name="reference"/></label>}{batchAction==="fund_reject"&&<label className={s.field}>Alasan penolakan *<textarea className={s.input} required minLength={5} name="reason"/></label>}
        {batchAction==="disburse"&&<><label className={s.field}>Tanggal transfer *<input className={s.input} name="transferDate" type="date" required/></label><label className={s.field}>Rekening tujuan *<input className={s.input} name="account" required/></label><label className={s.field}>Total ditransfer (Rp) *<input className={s.input} name="totalAmount" type="number" required min={1} defaultValue={selectedRows.reduce((sum,r)=>sum+(r.amount??0),0)}/><small>Pilih penerima dari satu Verifikator yang sama.</small></label><label className={s.upload}>Bukti transfer (opsional)<input type="file" name="file" accept="image/jpeg,image/png,image/webp"/></label></>}
        {batchAction==="approve"&&selectedRows.map(r=><label className={s.field} key={r.id}>{r.name} · nominal (Rp)<input className={s.input} type="number" min={1} required value={amounts[r.id]??r.amount??""} onChange={e=>setAmounts(v=>({...v,[r.id]:e.target.value}))}/></label>)}</div><button className={s.button} style={{marginTop:20}} disabled={batchBusy||!batchAction}>{batchBusy?"Memproses…":"Konfirmasi tindakan massal"}</button></form></section>}
      </>}
    </main></div>
  </div>;
}

function Detail({ row,viewer,staff,reload }: {row:AidDetail;viewer:BantuanViewer;staff:BantuanStaff[];reload:()=>void}) {
  const [todayTime]=useState(()=>Date.now());
  const [section,setSection]=useState("pemohon");
  const isSurveyEntry=viewer.role==="verifier"&&row.verifierId===viewer.id&&row.status==="survey_assigned";
  const detailTabs=[{id:"pemohon",label:"Data pemohon"},{id:"dokumen",label:"Dokumen pendukung"},{id:"tindakan",label:isSurveyEntry?"Hasil survei":"Tindakan"},{id:"riwayat",label:"Riwayat"}];
  const upcoming=nextStep(row.status,row.source);
  const canAct=getAvailableActions(row,viewer).length>0;
  const openActions=()=>{setSection("tindakan");requestAnimationFrame(()=>document.getElementById("case-tab-tindakan")?.scrollIntoView({behavior:"smooth",block:"start"}));};
  const person=(id:string|null)=>staff.find(p=>p.id===id)?.name??"Belum ditugaskan";
  const labels:Record<string,string>={intakeType:"Jenis pengajuan",name:"Nama lengkap",nik:"NIK",birthPlace:"Tempat lahir",birthDate:"Tanggal lahir",gender:"Jenis kelamin",maritalStatus:"Status pernikahan",street:"Alamat",rtRw:"RT / RW",village:"Desa / kelurahan",district:"Kecamatan",city:"Kabupaten / kota",housing:"Status tempat tinggal",rent:"Biaya sewa",job:"Pekerjaan",phone:"Nomor HP",income:"Penghasilan",incomePeriod:"Periode penghasilan",dependentCount:"Jumlah tanggungan",dependents:"Rincian tanggungan",prayer:"Sholat 5 waktu",smoking:"Merokok",previousAid:"Pernah dibantu",previousAidNotes:"Bantuan sebelumnya",publicationConsent:"Persetujuan publikasi",willingSktm:"Bersedia mengurus SKTM",informationSource:"Sumber informasi",problem:"Masalah yang dihadapi",date:"Tanggal laporan",type:"Jenis pelapor",address:"Alamat",background:"Latar belakang",currentCondition:"Kondisi saat ini",needs:"Kebutuhan",efforts:"Upaya yang dilakukan",homeObservation:"Kondisi rumah",socialRecord:"Kondisi sosial",recommendation:"Rekomendasi",notes:"Catatan",suggestions:"Kritik & saran",hasSktm:"Memiliki SKTM",sktmExplanation:"Penjelasan SKTM",stayDuration:"Lama tinggal",stayUnit:"Satuan",method:"Metode penyerahan",amount:"Nominal diserahkan",differenceReason:"Alasan selisih nominal"};
  const renderData=(data:Record<string,unknown>)=><dl className={s.infoGrid}>{Object.entries(data).map(([k,v])=>["latitude","longitude","contacts"].includes(k)?null:<div key={k}><dt>{labels[k]??k}</dt><dd>{k==="intakeType"?(v==="returning"?"Pemohon pernah mengajukan":"Pemohon baru"):k==="dependents"?<DependentsSummary value={v}/>:typeof v==="boolean"?(v?"Ya":"Tidak"):String(v??"—").replaceAll("_"," ")}</dd></div>)}</dl>;
  return <><Link href="/admin/bantuan/pengajuan" className={s.link}>← Semua pengajuan</Link><div className={s.heading} style={{marginTop:20}}><div><div className={s.eyebrow}>{row.number} · {row.source==="bypass"?"JALUR LANGSUNG":row.source==="walk_in"?"WALK-IN":"ONLINE"}</div><h1>{row.name}</h1><p>{row.program} <span style={{padding:"0 7px"}}>·</span> {row.region} <span style={{padding:"0 7px"}}>·</span> {day(row.createdAt)}</p></div><div className={s.actions}><Badge status={row.status}/>{["draft","needs_data","screening"].includes(row.status)&&["admin","call_center","verifier"].includes(viewer.role)&&<Link className={`${s.button} ${s.secondary}`} href={`/admin/bantuan/pengajuan/${row.id}/edit`}>Edit data</Link>}</div></div>
    <ApplicantHistory count={row.duplicateCount} applications={row.duplicateApplications??[]}/>
    {row.bypassReason&&<div className={s.notice}>Alasan jalur langsung: {row.bypassReason}</div>}
    <div className={s.caseSummary}>
      <div><small>Nominal bantuan</small><strong>{row.amount?money(row.amount):"Belum ditetapkan"}</strong></div>
      <div><small>Verifikator</small><strong>{person(row.verifierId)}</strong></div>
      <div><small>Penyalur</small><strong>{row.distributionType==="direct"?"Bendahara langsung":person(row.distributorId)}</strong></div>
      <div><small>{row.disbursedAt?"Dana dicairkan":"Referensi dana"}</small><strong>{row.disbursedAt?day(row.disbursedAt):row.fundReference??"Belum ada"}</strong></div>
    </div>
    <section className={s.nextStep} aria-label="Langkah berikutnya"><span className={s.nextStepIcon}><Icon name="arrow"/></span><div><small>LANGKAH BERIKUTNYA</small><h2>{upcoming.title}</h2><p>{upcoming.description}</p></div><span className={s.nextOwner}>{upcoming.owner}</span>{canAct&&<button type="button" className={s.button} onClick={openActions}>{isSurveyEntry?"Isi hasil survei":"Buka langkah berikutnya"}<Icon name="arrow"/></button>}</section>
    <PageGuide title="Cara menyelesaikan tahap pengajuan ini" steps={["Periksa Data pemohon dan Dokumen pendukung terlebih dahulu.",canAct?"Tekan Buka langkah berikutnya untuk menuju form tindakan Anda.":`Tahap ini menunggu ${upcoming.owner}. Anda dapat memantau perkembangan melalui Riwayat.`,"Isi form yang tersedia, lalu konfirmasi. Setelah berhasil, Anda kembali ke daftar pengajuan."]}/>
    <div className={s.caseWorkspace}>
      <div className={s.caseTabs} role="tablist" aria-label="Bagian pengajuan">{detailTabs.map(item=><button type="button" key={item.id} role="tab" id={"case-tab-"+item.id} aria-controls={"case-panel-"+item.id} aria-selected={section===item.id} onClick={()=>setSection(item.id)} onKeyDown={e=>{
        if(!["ArrowLeft","ArrowRight","Home","End"].includes(e.key))return;
        e.preventDefault();const i=detailTabs.findIndex(t=>t.id===item.id),index=e.key==="Home"?0:e.key==="End"?detailTabs.length-1:(i+(e.key==="ArrowRight"?1:-1)+detailTabs.length)%detailTabs.length;
        setSection(detailTabs[index].id);document.getElementById("case-tab-"+detailTabs[index].id)?.focus();
      }} tabIndex={section===item.id?0:-1}>{item.label}</button>)}</div>
      {/* Keep every panel mounted: switching tabs or uploading must retain drafts. */}
      <div role="tabpanel" id="case-panel-tindakan" aria-labelledby="case-tab-tindakan" hidden={section!=="tindakan"} className={s.casePanel}>
        <ActionPanel key={row.id} row={row} viewer={viewer} staff={staff} reload={reload}/>
        {row.survey&&!isSurveyEntry&&<section className={s.card}><div className={s.cardHeader}><h2>Hasil verifikasi</h2></div><div className={s.cardBody}>{renderData(row.survey)}{Array.isArray(row.survey.contacts)&&row.survey.contacts.length>0&&<><h3 className={s.sectionTitle} style={{marginTop:20}}>Kontak kerabat / tetangga</h3>{(row.survey.contacts as {name:string;relationship:string;phone:string}[]).map((c,i)=><p key={i}>{c.name} · {c.relationship} · {c.phone}</p>)}</>}</div></section>}
        {row.handover&&<section className={s.card}><div className={s.cardHeader}><h2>Penyerahan bantuan</h2><Badge status="completed"/></div><div className={s.cardBody}>{renderData(row.handover)}</div></section>}
        <div className={s.caseShortcuts}><button type="button" onClick={()=>setSection("dokumen")}><Icon name="upload"/> Unggah / lihat dokumen <Icon name="arrow"/></button><button type="button" onClick={()=>setSection("riwayat")}><Icon name="history"/> Lihat riwayat proses <Icon name="arrow"/></button></div>
      </div>
      <div role="tabpanel" id="case-panel-pemohon" aria-labelledby="case-tab-pemohon" hidden={section!=="pemohon"} className={s.casePanel}><section className={s.card}><div className={s.cardHeader}><h2>Data pemohon</h2><span className={s.pill}>Privat</span></div><div className={s.cardBody}>{renderData(row.applicant)}<div className={s.actions} style={{marginTop:20}}>{typeof row.applicant.income==="number"&&<span className={s.pill}>Estimasi bulanan: {money(row.applicant.income*(row.applicant.incomePeriod==="hari"?30:row.applicant.incomePeriod==="pekan"?52/12:1))}</span>}{typeof row.applicant.birthDate==="string"&&<span className={s.pill}>Usia {Math.max(0,Math.floor((todayTime-new Date(row.applicant.birthDate).getTime())/31557600000))} tahun</span>}{row.applicant.street&&<a className={s.link} href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([row.applicant.street,row.applicant.village,row.applicant.district,row.applicant.city].join(", "))}`} target="_blank" rel="noreferrer">Buka peta ↗</a>}</div></div></section></div>
      <div role="tabpanel" id="case-panel-dokumen" aria-labelledby="case-tab-dokumen" hidden={section!=="dokumen"} className={s.casePanel}><DocumentUpload row={row} viewer={viewer} reload={reload}/></div>
      <div role="tabpanel" id="case-panel-riwayat" aria-labelledby="case-tab-riwayat" hidden={section!=="riwayat"} className={s.casePanel}><section className={s.card}><div className={s.cardHeader}><h2>Riwayat proses</h2><span className={s.tiny}>{row.events.length} aktivitas</span></div><div className={s.historyScroll}><div className={s.timeline}>{[...row.events].reverse().map(e=><div className={s.event} key={e.id}><strong>{bantuanActionLabels[e.action]??e.action.replaceAll("_"," ")}</strong><p>{e.actorName??"Petugas"} · {bantuanRoles[e.actor_role]??e.actor_role} · {new Date(e.created_at).toLocaleString("id-ID")}</p>{e.to_status&&<Badge status={e.to_status}/>} {e.reason&&<p>{e.reason}</p>}</div>)}</div></div></section></div>
    </div></>;
}
