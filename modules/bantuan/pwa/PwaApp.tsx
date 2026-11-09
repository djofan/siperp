"use client";
import { useCallback,useEffect,useState,type ReactNode } from "react";
import Link from "next/link";
import { canManageOwnPasswordInModule } from "../permissions";
import { ChangePassword } from "@/modules/core/ChangePassword";
import { PwaPushControl } from "./PwaPushControl";
import { Home,ClipboardList,HandHeart,Bell,User,HeartHandshake,ArrowUpRight,ArrowLeft,ChevronRight,RefreshCw,LogOut,Search,Wallet,CheckCircle2,Clock,Smartphone,ExternalLink } from "lucide-react";
import type { AidApplication,AidDashboard,AidDetail,AidNotification,AidPage,BantuanStaff,BantuanViewer,SantunanRecord } from "@/contracts/modules/bantuan";
import { bantuanStatuses } from "@/contracts/modules/bantuan";
import { roleLabel } from "../permissions";
import { day,money } from "../api/client";
import { clearDrafts } from "../api/vault";
import { clearPhotoMemory } from "../api/photo-queue";
import { Santunan } from "../components/Santunan";
import { ActionPanel,DocumentUpload } from "../components/ActionPanel";
import { pwaAccess,pwaTabs,pwaRoot,taskKinds,taskLabels,taskQuery,taskStates,type TaskKind } from "./policy";
import { pwaRequest } from "./client";
import { disableWebPush } from "./web-push";
import base from "../components/Workspace.module.css";
import s from "./Pwa.module.css";

const icons={beranda:Home,tugas:ClipboardList,santunan:HandHeart,notifikasi:Bell,akun:User};
function Empty({title,children}:{title:string;children?:ReactNode}){return <div className={s.empty}><HandHeart size={32} strokeWidth={1.3}/><h3>{title}</h3>{children&&<p>{children}</p>}</div>;}
function Loading(){return <div role="status" className={s.loading}><span/>Menyiapkan data terbaru…</div>;}
function ErrorNotice({message,retry}:{message:string;retry:()=>void}){return <div className={s.error} role="alert"><span>{message}</span><button onClick={retry}>Coba lagi</button></div>;}
function Status({value}:{value:string}){return <span className={s.badge} data-done={value==="completed"}>{bantuanStatuses[value]??value}</span>;}

export function PwaApp({viewer,route}:{viewer:BantuanViewer;route:string[]}) {
  const tab=route[0],access=pwaAccess(viewer),tabs=pwaTabs(viewer);
  const [staff,setStaff]=useState<BantuanStaff[]|null>(null),[staffError,setStaffError]=useState(""),[revision,setRevision]=useState(0),[unread,setUnread]=useState<number|null>(null),[loggingOut,setLoggingOut]=useState(false),[logoutError,setLogoutError]=useState("");
  const retry=()=>setRevision(value=>value+1);
  useEffect(()=>{
    const expired=()=>window.location.replace("/bantuan-app/login");
    const pushed=()=>setRevision(value=>value+1);
    window.addEventListener("bantuan-push-received",pushed);
    window.addEventListener("bantuan-session-expired",expired);
    return()=>{window.removeEventListener("bantuan-session-expired",expired);window.removeEventListener("bantuan-push-received",pushed);};
  },[]);
  useEffect(()=>{
    const controller=new AbortController();
    pwaRequest<BantuanStaff[]>("staff",{signal:controller.signal}).then(data=>{setStaff(data);setStaffError("");}).catch(error=>{if(!controller.signal.aborted)setStaffError(error.message);});
    return()=>controller.abort();
  },[revision]);
  useEffect(()=>{
    const controller=new AbortController();
    const refresh=()=>{if(document.visibilityState!=="visible")return;void pwaRequest<AidNotification[]>("notifications",{signal:controller.signal}).then(data=>setUnread(data.filter(note=>!note.read_at).length)).catch(()=>{/* Notification page exposes errors and retry. */});};
    refresh();const timer=setInterval(refresh,60000);window.addEventListener("focus",refresh);document.addEventListener("visibilitychange",refresh);
    return()=>{controller.abort();clearInterval(timer);window.removeEventListener("focus",refresh);document.removeEventListener("visibilitychange",refresh);};
  },[revision]);
  async function logout(){
    if(loggingOut)return;setLoggingOut(true);setLogoutError("");
    try {
      await disableWebPush().catch(()=>undefined);
      const { disablePwaPush }=await import("./push-client");
      await disablePwaPush().catch(()=>undefined);
      const response=await fetch("/api/auth/logout",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{Accept:"application/json"}});
      if(!response.ok&&response.status!==401)throw new Error("Keluar belum berhasil. Periksa koneksi dan coba lagi.");
      clearPhotoMemory(viewer.id);await clearDrafts(viewer.id).catch(()=>undefined);
      window.location.replace("/bantuan-app/login");
    }catch(error){setLogoutError(error instanceof Error?error.message:"Koneksi terputus. Coba keluar kembali.");setLoggingOut(false);}
  }
  const title=tabs.find(item=>item.key===tab)?.label??"Bantuan";
  return <div className={`${base.app} ${s.app}`}>
    <a href="#pwa-content" className={s.skip}>Langsung ke isi</a>
    <header className={s.header}><Link href={`${pwaRoot}/beranda`} className={s.brand}><span className={s.mark}><HeartHandshake size={23}/></span><span>Bantuan <b>SIP</b><small>Solidaritas Insan Peduli</small></span></Link><Link href={`${pwaRoot}/notifikasi`} className={s.bell} aria-label={`Notifikasi${unread!==null?`, ${unread} belum dibaca`:""}`}><Bell size={21}/>{unread!==null&&unread>0&&<span>{unread>99?"99+":unread}</span>}</Link></header>
    <main id="pwa-content" className={s.content}>
      {tab!=="beranda"&&tab!=="santunan"&&<div className={s.pageTitle}><span className={s.eyebrow}>BANTUAN SIP</span><h1>{title}</h1></div>}
      <PwaPushControl viewerId={viewer.id} showControls={tab==="akun"||tab==="notifikasi"}/>
      {staffError&&<ErrorNotice message={`Daftar tim belum dapat dimuat: ${staffError}`} retry={retry}/>}
      {tab==="beranda"&&<HomeScreen viewer={viewer} revision={revision} retry={retry}/>}
      {tab==="tugas"&&(route[1]?staff?<TaskDetail id={route[1]} viewer={viewer} staff={staff}/>:!staffError&&<Loading/>:<TaskList viewer={viewer}/>)}
      {tab==="santunan"&&access.santunan&&(staff?<div className={s.santunan}><Santunan viewer={viewer} staff={staff}/></div>:!staffError&&<Loading/>)}
      {tab==="notifikasi"&&<Notifications viewer={viewer} onRead={retry} refreshKey={revision}/>}
      {tab==="akun"&&<>{canManageOwnPasswordInModule(viewer)&&<ChangePassword/>}<section className={s.profile}><span className={s.avatar}>{viewer.name.slice(0,1)}</span><h2>{viewer.name}</h2><p>{roleLabel(viewer)}</p><dl><div><dt>Kode akun</dt><dd>{viewer.code??"Hubungi pengelola"}</dd></div><div><dt>Akses</dt><dd>Modul Bantuan</dd></div></dl></section><section className={s.panel}><h2><Smartphone size={19}/>Pasang di HP</h2><p>Android: buka menu browser lalu pilih Pasang aplikasi atau Tambahkan ke layar utama. iPhone: buka di Safari, tekan Bagikan, lalu Tambahkan ke Layar Utama.</p><p>Aplikasi memerlukan internet untuk membaca dan mengirim data. Aktifkan Notifikasi di HP untuk menerima push. Izin serta dukungan perangkat diperlukan.</p></section><Link href="/admin/bantuan" className={s.rowLink}><ExternalLink size={18}/>Dashboard web lengkap<ChevronRight size={17}/></Link>{logoutError&&<div role="alert" className={s.error}>{logoutError}</div>}<button className={s.logout} onClick={()=>void logout()} disabled={loggingOut}><LogOut size={19}/>{loggingOut?"Sedang keluar…":"Keluar dari akun"}</button></>}
    </main>
    <nav className={s.nav} aria-label="Navigasi aplikasi" style={{gridTemplateColumns:`repeat(${tabs.length},1fr)`}}>{tabs.map(item=>{const Icon=icons[item.key];return <Link key={item.key} href={`${pwaRoot}/${item.key}`} aria-current={tab===item.key?"page":undefined}><span><Icon size={21}/>{item.key==="notifikasi"&&unread!==null&&unread>0&&<i/>}</span>{item.label}</Link>;})}</nav>
  </div>;
}

function HomeScreen({viewer,revision,retry}:{viewer:BantuanViewer;revision:number;retry:()=>void}) {
  const access=pwaAccess(viewer);
  const [data,setData]=useState<{dashboard:AidDashboard|null;santunan:SantunanRecord[];notes:AidNotification[]}|null>(null),[error,setError]=useState("");
  useEffect(()=>{
    const controller=new AbortController(),init={signal:controller.signal};
    Promise.all([access.tasks?pwaRequest<AidDashboard>("dashboard",init):Promise.resolve(null),access.santunan?pwaRequest<SantunanRecord[]>("santunan",init):Promise.resolve([]),pwaRequest<AidNotification[]>("notifications",init)]).then(([dashboard,santunan,notes])=>{setData({dashboard,santunan,notes});setError("");}).catch(err=>{if(!controller.signal.aborted)setError(err.message);});
    return()=>controller.abort();
  },[access.tasks,access.santunan,revision]);
  const firstName=viewer.name.split(" ")[0];
  const remaining=data?.santunan.filter(row=>row.distributionStatus==="process")??[];
  const waiting=remaining.filter(row=>row.transferStatus==="pending").length;
  const activeTaskStates=[...new Set(taskKinds(viewer).flatMap(kind=>taskStates[kind]))];
  const activeTasks=activeTaskStates.reduce((total,status)=>total+Number(data?.dashboard?.byStatus[status]??0),0);
  return <>
    <div className={s.greeting}><div><p>Assalamu’alaikum, {firstName}</p><h1>Siap menebar<br/>kebaikan hari ini?</h1></div><button className={s.refresh} aria-label="Muat ulang ringkasan" onClick={retry}><RefreshCw size={19}/></button></div>
    <section className={s.hero}><span className={s.heroIcon}><HandHeart size={29}/></span><div><span>SETIAP AMANAH BERARTI</span><h2>Hadirkan manfaat,<br/>tuntaskan amanah.</h2><p>{access.santunan?"Pantau transfer dan laporan penyaluran santunan.":"Periksa penugasan dan catat hasil kunjungan Anda."}</p><Link href={`${pwaRoot}/${access.santunan?"santunan":access.tasks?"tugas":"notifikasi"}`}>{access.santunan?"Buka santunan":"Lihat aktivitas"}<ArrowUpRight size={18}/></Link></div></section>
    {error?<ErrorNotice message={error} retry={retry}/>:!data?<Loading/>:<>
      <div className={s.sectionHeading}><h2>Ringkasan pekerjaan</h2><span>Sesuai akses akun</span></div>
      <div className={s.metrics}>
        {access.tasks&&<Link href={`${pwaRoot}/tugas`}><ClipboardList size={20}/><strong>{activeTasks}</strong><span>Tugas aktif</span></Link>}
        {access.survey&&<Link href={`${pwaRoot}/tugas`}><ClipboardList size={20}/><strong>{data.dashboard?.byStatus.survey_assigned??0}</strong><span>Survei berjalan</span></Link>}
        {access.transfer&&<Link href={`${pwaRoot}/tugas`}><Wallet size={20}/><strong>{data.dashboard?.byStatus.fund_approved??0}</strong><span>Siap dicairkan</span></Link>}
        {access.santunan&&<Link href={`${pwaRoot}/santunan`}><Clock size={20}/><strong>{remaining.length}</strong><span>Santunan belum selesai</span></Link>}
        <Link href={`${pwaRoot}/notifikasi`}><Bell size={20}/><strong>{data.notes.filter(note=>!note.read_at).length}</strong><span>Notifikasi baru</span></Link>
      </div>
      {access.santunan&&<section className={s.reminder}><span><CheckCircle2 size={21}/></span><div><strong>{remaining.length?"Ada amanah yang menunggu":"Penyaluran Anda sudah tercatat"}</strong><p>{remaining.length?`${waiting} menunggu transfer, ${remaining.length-waiting} siap dilaporkan.`:"Santunan baru yang ditugaskan akan muncul di sini."}</p></div></section>}
      <div className={s.sectionHeading}><h2>Kabar terbaru</h2><Link href={`${pwaRoot}/notifikasi`}>Lihat semua</Link></div>
      {data.notes.length?data.notes.slice(0,3).map(note=><Link href={`${pwaRoot}/notifikasi`} className={s.note} key={note.id}><span className={s.noteIcon}><Bell size={18}/></span><div><p>{note.message}</p><small>{day(note.created_at)}</small></div><ChevronRight size={16}/></Link>):<Empty title="Belum ada kabar baru">Notifikasi penugasan akan muncul di sini.</Empty>}
    </>}
  </>;
}

function TaskList({viewer}:{viewer:BantuanViewer}) {
  const kinds=taskKinds(viewer);
  const [kind,setKind]=useState<TaskKind>(kinds[0]),[page,setPage]=useState(1),[search,setSearch]=useState(""),[query,setQuery]=useState(""),[revision,setRevision]=useState(0),[data,setData]=useState<AidPage|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(true);
  useEffect(()=>{const timer=setTimeout(()=>{setQuery(search);setPage(1);},300);return()=>clearTimeout(timer);},[search]);
  useEffect(()=>{
    const controller=new AbortController();
    pwaRequest<AidPage>(`applications?${taskQuery(viewer,kind,page,query)}`,{signal:controller.signal},false).then(result=>{setData(result);setError("");setLoading(false);}).catch(err=>{if(!controller.signal.aborted){setError(err.message);setLoading(false);}});
    return()=>controller.abort();
  },[viewer,kind,page,query,revision]);
  return <>
    <div className={s.tabs} aria-label="Jenis tugas">{kinds.map(value=><button key={value} aria-pressed={kind===value} onClick={()=>{if(value===kind)return;setLoading(true);setKind(value);setPage(1);}}>{taskLabels[value]}</button>)}</div>
    <label className={s.search}><Search size={19}/><input aria-label="Cari tugas berdasarkan nama atau nomor" placeholder="Cari nama atau nomor pengajuan" value={search} onChange={e=>{setSearch(e.target.value);setLoading(true);}}/></label>
    {error?<ErrorNotice message={error} retry={()=>{setLoading(true);setRevision(value=>value+1);}}/>:loading?<Loading/>:!data?.data.length?<Empty title="Belum ada tugas pada antrean ini">Coba antrean lain atau kata pencarian yang berbeda.</Empty>:<><p className={s.muted}>{data.total} tugas · halaman {data.current_page} dari {data.last_page}</p><div className={s.taskList}>{data.data.map(row=><TaskCard key={row.id} row={row}/>)}</div><div className={s.pagination}><button disabled={page<=1} onClick={()=>{setLoading(true);setPage(value=>value-1);}}>Sebelumnya</button><span>{page} / {data.last_page}</span><button disabled={page>=data.last_page} onClick={()=>{setLoading(true);setPage(value=>value+1);}}>Berikutnya</button></div></>}
  </>;
}
function TaskCard({row}:{row:AidApplication}) {return <Link className={s.task} href={`${pwaRoot}/tugas/${encodeURIComponent(row.id)}`}><div className={s.taskTop}><span>{row.program}</span><Status value={row.status}/></div><h3>{row.name}</h3><p>{row.number} · {row.region||"Wilayah belum dicatat"}</p><div className={s.taskBottom}><strong>{row.amount!==null?money(row.amount):"Nominal belum ditetapkan"}</strong><span>Buka tugas<ChevronRight size={17}/></span></div></Link>;}

function TaskDetail({id,viewer,staff}:{id:string;viewer:BantuanViewer;staff:BantuanStaff[]}) {
  const [row,setRow]=useState<AidDetail|null>(null),[error,setError]=useState(""),[revision,setRevision]=useState(0);
  const reload=useCallback(()=>setRevision(value=>value+1),[]);
  useEffect(()=>{const controller=new AbortController();pwaRequest<AidDetail>(`applications/${encodeURIComponent(id)}`,{signal:controller.signal}).then(data=>{setRow(data);setError("");}).catch(err=>{if(!controller.signal.aborted)setError(err.message);});return()=>controller.abort();},[id,revision]);
  return <><Link className={s.back} href={`${pwaRoot}/tugas`}><ArrowLeft size={18}/>Kembali ke tugas</Link>{error&&<ErrorNotice message={error} retry={reload}/>} {!row?!error&&<Loading/>:<div className={s.detail}><section className={s.panel}><Status value={row.status}/><h2>{row.name}</h2><p>{row.number} · {row.program}</p><strong>{row.amount!==null?money(row.amount):"Nominal belum ditetapkan"}</strong><dl>{[["Alamat",[row.applicant.street,row.applicant.village,row.applicant.district,row.applicant.city].filter(Boolean).join(", ")],["Petugas survei",staff.find(person=>person.id===row.verifierId)?.name],["Penyalur",staff.find(person=>person.id===row.distributorId)?.name]].map(([label,value])=><div key={String(label)}><dt>{label}</dt><dd>{value||"Belum dicatat"}</dd></div>)}</dl></section><ActionPanel key={`${row.id}:${row.status}`} row={row} viewer={viewer} staff={staff} reload={reload}/><details className={s.documents}><summary>Dokumen & foto bukti ({row.documents.length})</summary><DocumentUpload row={row} viewer={viewer} reload={reload}/></details><details className={s.documents}><summary>Riwayat proses</summary><div className={s.history}>{[...row.events].reverse().map(event=><div key={event.id}><strong>{event.actorName??"Petugas"}</strong><p>{bantuanStatuses[event.to_status]??event.to_status}</p>{event.reason&&<p>{event.reason}</p>}<small>{day(event.created_at)}</small></div>)}</div></details></div>}</>;
}

function Notifications({viewer,onRead,refreshKey}:{viewer:BantuanViewer;onRead:()=>void;refreshKey:number}) {
  const [notes,setNotes]=useState<AidNotification[]|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(""),[revision,setRevision]=useState(0);
  useEffect(()=>{const controller=new AbortController();pwaRequest<AidNotification[]>("notifications",{signal:controller.signal}).then(data=>{setNotes(data);setError("");}).catch(err=>{if(!controller.signal.aborted)setError(err.message);});return()=>controller.abort();},[revision,refreshKey]);
  async function mark(note?:AidNotification){setBusy(note?.id??"all");setError("");try{await pwaRequest(note?`notifications/${note.id}/read`:"notifications/read-all",{method:"PUT"});setNotes(current=>current?.map(item=>!note||item.id===note.id?{...item,read_at:new Date().toISOString()}:item)??null);onRead();}catch(err){setError(err instanceof Error?err.message:"Notifikasi belum dapat diperbarui.");}finally{setBusy("");}}
  return <>{error&&<ErrorNotice message={error} retry={()=>setRevision(value=>value+1)}/>}<p className={s.muted}>50 notifikasi terbaru. Pemberitahuan diperbarui saat aplikasi dibuka.</p>{notes?.some(note=>!note.read_at)&&<button className={s.outline} disabled={!!busy} onClick={()=>void mark()}>Tandai semua dibaca</button>}{!notes?!error&&<Loading/>:!notes.length?<Empty title="Belum ada notifikasi">Tugas baru dan perubahan status akan tampil di sini.</Empty>:notes.map(note=><article className={s.notification} data-unread={!note.read_at} key={note.id}><div className={s.noteIcon}><Bell size={18}/></div><div><p>{note.message}</p><small>{day(note.created_at)}</small><div className={s.notificationActions}>{!note.read_at&&<button disabled={!!busy} onClick={()=>void mark(note)}>{busy===note.id?"Menyimpan…":"Tandai dibaca"}</button>}{note.application_id&&pwaAccess(viewer).tasks&&<Link href={`${pwaRoot}/tugas/${encodeURIComponent(note.application_id)}`}>Buka pengajuan<ChevronRight size={15}/></Link>}</div></div></article>)}</>;
}
