"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
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
import { ProcessSuccess } from "./ProcessSuccess";
import { Santunan } from "./Santunan";
import { ApplicantHistory } from "./ApplicantHistory";
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
  const [dashboard,setDashboard]=useState<AidDashboard|null>(null),[page,setPage]=useState<AidPage|null>(null),[detail,setDetail]=useState<AidDetail|null>(null);
  const [notifications,setNotifications]=useState<AidNotification[]>([]),[showNotifications,setShowNotifications]=useState(false),[mobile,setMobile]=useState(false);
  const [loading,setLoading]=useState(true),[error,setError]=useState(""),[search,setSearch]=useState(""),[status,setStatus]=useState(""),[program,setProgram]=useState(""),[number,setNumber]=useState(1);
  const [selected,setSelected]=useState<Record<string,boolean>>({}),[batchAction,setBatchAction]=useState(""),[batchBusy,setBatchBusy]=useState(false),[revision,setRevision]=useState(0);
  const [menuQuery,setMenuQuery]=useState(""),[loggingOut,setLoggingOut]=useState(false);
  const navRef=useRef<HTMLElement>(null);
  useEffect(()=>{
    const nav=navRef.current,active=nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if(nav&&active)nav.scrollTop=Math.max(0,active.offsetTop-(nav.clientHeight-active.clientHeight)/2);
  },[key,viewer?.role]);
  const [batchSuccess,setBatchSuccess]=useState(false);
  const [amounts,setAmounts]=useState<Record<string,string>>({});
  // Refresh data in place. Unmounting detail would discard unsaved form values.
  const reload=useCallback(()=>{setError("");setRevision(v=>v+1);},[]);
  const finishBatch=useCallback(()=>{setBatchSuccess(false);reload();},[reload]);
  useEffect(()=>{let live=true;
    async function load(){
      try{
        const [who,people,stats,notes]=await Promise.all([request<BantuanViewer>("viewer"),request<BantuanStaff[]>("staff"),request<AidDashboard>("dashboard"),request<AidNotification[]>("notifications")]);
        if(!live)return;setViewer(who);setStaff(people);setDashboard(stats);setNotifications(notes);
        if(tab==="pengajuan"&&applicationId&&!isNew){const row=await request<AidDetail>(`applications/${encodeURIComponent(applicationId)}`);if(live)setDetail(row);}
        else if(!["tim","pengaturan","audit","proses","santunan"].includes(tab)&&!isNew){
          const params=new URLSearchParams({page:String(number),...(search?{search}:{}),...(status?{status}:{}),...(program?{program}:{})});
          if(!status){const states=defaultListStates(who,tab);if(states.length)params.set("states",states.join(","));}
          const task=processInfo(tab)?.task;if(who.role==="verifier"&&task)params.set("task",task);
          const rows=await request<AidPage>(`applications?${params}`,{},false);if(live)setPage(rows);
        }
      }catch(err){if(live)setError(err instanceof Error?err.message:"Data tidak dapat dimuat.");}finally{if(live)setLoading(false);}
    }void load();return()=>{live=false;};
  },[key,tab,applicationId,isNew,number,status,search,program,revision]); // Route values are represented by key.
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
  const queueStates=viewer?defaultListStates(viewer,tab):[];
  const newHref="/admin/bantuan/pengajuan/"+(viewer?.role==="verifier"?"langsung":"baru");
  const listTitle:Record<string,string>={...(queue?{[tab]:queue.label}:{}),pengajuan:"Semua pengajuan",review:"Antrean persetujuan",survei:queue?.label??"Tugas lapangan",dana:"Pengajuan dana",pencairan:queue?.label??"Pencairan & penyaluran",penyaluran:queue?.label??"Penyerahan bantuan",screening:queue?.label??"Antrean screening",laporan:"Laporan bantuan"};
  const isDetail=tab==="pengajuan"&&applicationId&&!isNew;
  const isEdit=isDetail&&route[2]==="edit";
  const selectedRows=page?.data.filter(r=>selected[r.id])??[];
  const batchStates:Record<string,string[]>={approve:["survey_submitted","review2","bypass_review"],fund_submit:["fund_ready"],fund_approve:["fund_submitted"],fund_reject:["fund_submitted"],disburse:["fund_approved"]};
  const batchOptions=viewer?[...(["admin","approver","chair"].includes(viewer.role)?["approve"]:[]),...(["admin","fund_requester"].includes(viewer.role)?["fund_submit","fund_approve","fund_reject"]:[]),...(["admin","treasurer"].includes(viewer.role)?["disburse"]:[])]:[];
  const eligibleBatchOptions=batchOptions.filter(a=>selectedRows.every(r=>batchStates[a].includes(r.status)));
  return <div className={s.app}>
    {batchSuccess&&<ProcessSuccess title="Proses massal berhasil" description="Seluruh pengajuan yang dipilih sudah diproses." onContinue={finishBatch}/>}
    {mobile&&<button className={s.mobileOverlay} aria-label="Tutup navigasi" onClick={()=>setMobile(false)}/>}
    <aside className={s.sidebar} data-open={mobile}><Link href="/admin/bantuan" className={s.brand}><span className={s.brandLabel}>LAZSIP</span><strong>Pengajuan bantuan</strong></Link>
      <nav ref={navRef} className={s.nav} aria-label="Navigasi modul">{links.map((link,i)=><div key={link.key}>{link.group!=="Umum"&&links[i-1]?.group!==link.group&&<div className={s.navLabel}>{link.group}</div>}<Link href={`/admin/bantuan${link.key?"/"+link.key:""}`} data-active={activeLink?.key===link.key} aria-current={activeLink?.key===link.key?"page":undefined} onClick={()=>setMobile(false)}><Icon name={link.icon}/><span className={s.navText}>{link.label}</span>{link.states&&dashboard&&!(viewer?.role==="verifier"&&link.task)&&<span className={s.navCount}>{link.states.reduce((sum,state)=>sum+Number(dashboard.byStatus[state]??0),0)}</span>}</Link></div>)}</nav>
      <div className={s.sidebarHelp}><Icon name="shield"/><div><strong>Ruang kerja internal</strong><p>Data pribadi hanya untuk petugas berwenang.</p></div></div>
      <div className={s.sidebarFooter}><span className={s.avatar}>{viewer?.name.slice(0,2).toUpperCase()??"…"}</span><div style={{minWidth:0}}><strong style={{fontSize:12}}>{viewer?.name??"Memuat akun…"}</strong><div className={s.tiny}>{bantuanRoles[viewer?.role??""]??""}</div></div><button className={s.iconButton} aria-label="Keluar dari akun" title="Keluar" onClick={()=>void logout()} disabled={loggingOut}><Icon name="logout"/></button></div>
    </aside>
    <div className={s.body}><header className={s.topbar}><div style={{display:"flex",gap:12,alignItems:"center"}}><button className={`${s.iconButton} ${s.menuButton}`} aria-label="Buka navigasi" onClick={()=>setMobile(true)}><Icon name="menu"/></button><div className={s.breadcrumb}><span>Workspace</span><span>/</span><strong>{queue?.label??activeLink?.label??"Pengajuan"}</strong></div></div><form className={s.menuSearch} onSubmit={e=>{e.preventDefault();const match=allLinks.find(l=>l.label.toLowerCase().includes(menuQuery.trim().toLowerCase()));if(menuQuery.trim()&&match){router.push("/admin/bantuan"+(match.key?"/"+match.key:""));setMenuQuery("");}}}><Icon name="search"/><input aria-label="Cari menu Bantuan" placeholder="Cari menu..." value={menuQuery} onChange={e=>setMenuQuery(e.target.value)}/></form><div className={s.topActions}><Link href="/admin" className={s.platformButton} title="Pilihan modul"><Icon name="grid"/><span>Pilihan modul</span></Link><span className={s.pill}>Internal</span><button className={s.iconButton} aria-label="Notifikasi" aria-expanded={showNotifications} onClick={()=>setShowNotifications(v=>!v)}><Icon name="bell"/>{notifications.some(n=>!n.read_at)&&<span className={s.dot}/>}</button><div className={s.topProfile}><span className={s.avatar}>{viewer?.name.slice(0,1)??"S"}</span><div><strong>{viewer?.name}</strong><small>{bantuanRoles[viewer?.role??""]}</small></div></div></div></header>
    {showNotifications&&<section className={s.popover}><div className={s.cardHeader} style={{padding:"0 0 14px"}}><h2>Notifikasi</h2><button className={s.link} onClick={()=>setShowNotifications(false)}>Tutup</button></div>{notifications.length?notifications.map(n=><button key={n.id} className={s.notification} onClick={()=>markRead(n)} style={{fontWeight:n.read_at?400:600}}>{n.message}<small>{day(n.created_at)}</small></button>):<p className={s.tiny}>Belum ada notifikasi baru.</p>}</section>}
    <main className={s.main}>{error&&<div className={`${s.notice} ${s.error}`} role="alert"><span>{error}</span><button aria-label="Tutup pesan" onClick={()=>setError("")}>×</button></div>}
      {!viewer?<div className={s.skeleton}>{loading?"Memuat workspace…":<><p>Akses modul belum tersedia. Pastikan Anda mendapat izin dari superadmin.</p><Link className={s.button} href="/admin">Kembali ke platform</Link></>}</div>:
      isNew?canCreate?<IntakeForm viewer={viewer} direct={applicationId==="langsung"}/>:<div className={s.empty}>Peran ini tidak dapat membuat pengajuan.</div>:
      isDetail?loading?<div className={s.skeleton}>Memuat pengajuan…</div>:detail?isEdit?<IntakeForm viewer={viewer} initial={detail}/>:<Detail row={detail} viewer={viewer} staff={staff} reload={reload}/>:null:
      tab==="proses"?<ProcessHub viewer={viewer} dashboard={dashboard}/>:
      tab==="santunan"?<Santunan viewer={viewer} staff={staff}/>:
      ["tim","pengaturan","audit"].includes(tab)?<Management tab={tab} viewer={viewer} staff={staff} reload={reload}/>:
      <><div className={s.heading}><div>{queue&&<Link className={s.backLink} href="/admin/bantuan/proses"><Icon name="back"/>Semua proses</Link>}<div className={s.eyebrow}>{tab?"OPERASIONAL BANTUAN":"SELAMAT DATANG KEMBALI"}</div><h1>{tab?listTitle[tab]??"Pengajuan bantuan":`Ringkasan bantuan`}</h1><p>{queue?.description??(tab==="dana"?"Penanda manual dari web pengajuan dana. Tidak ada transfer otomatis.":tab==="pencairan"?"Pantau dana siap cair dan bukti penyerahan yang belum lengkap.":"Pantau setiap tahap, pastikan bantuan sampai kepada yang membutuhkan.")}</p></div><div className={s.actions}>{tab==="laporan"&&["admin","approver","chair","fund_requester","treasurer"].includes(viewer.role)&&<a className={`${s.button} ${s.secondary}`} href="/api/bantuan/export">↓ Ekspor CSV</a>}{canCreate&&<Link className={s.button} href={newHref}><Icon name="plus"/>Pengajuan baru</Link>}</div></div>
      {dashboard&&<><div className={`${s.stats} ${tab?s.compactStats:""}`}>{[
        {label:"Total pengajuan",value:dashboard.total,hint:"Sesuai cakupan akses Anda",icon:"file"},
        {label:"Menunggu persetujuan",value:["review1","survey_submitted","review2","bypass_review"].reduce((a,k)=>a+Number(dashboard.byStatus[k]??0),0),hint:"Review tahap 1, 2 & jalur langsung",icon:"clock"},
        {label:"Siap disalurkan",value:dashboard.byStatus.disbursed??0,hint:"Dana sudah berada di penyalur",icon:"wallet"},
        {label:"Bantuan selesai",value:dashboard.byStatus.completed??0,hint:"Bukti penyerahan sudah lengkap",icon:"check"},
      ].map((stat,i)=><div key={stat.label} className={`${s.stat} ${i===3?s.accentCard:""}`}><div className={s.statTop}>{stat.label}<Icon name={stat.icon}/></div><strong>{stat.value}</strong><p>{stat.hint}</p></div>)}</div>
      {dashboard.overdue>0&&<div className={s.notice}>{dashboard.overdue} pengajuan melewati batas penyaluran {viewer.settings.distributionDays} hari. Mohon segera lengkapi bukti penyerahan.<Link className={s.link} href={allLinks.some(link=>link.key==="penyaluran")?"/admin/bantuan/penyaluran":"/admin/bantuan/pengajuan"}>Tinjau →</Link></div>}
      {(tab===""||tab==="laporan")&&<div className={s.split}><section className={s.card}><div className={s.cardHeader}><div><h2>Perjalanan bantuan</h2><p>Ringkasan pengajuan berdasarkan tahap</p></div><span className={s.pill}>Seluruh periode</span></div><div className={s.cardBody}>{[["Proses screening",["draft","screening","needs_data"]],["Review & survei",["review1","survey_assignment","survey_assigned","survey_submitted","review2","bypass_review"]],["Proses dana",["approved","fund_ready","fund_submitted","fund_approved"]],["Penyaluran",["disbursed"]],["Selesai",["completed"]]].map(([label,keys])=>{const count=(keys as string[]).reduce((a,k)=>a+Number(dashboard.byStatus[k]??0),0);return <div key={String(label)}><div className={s.progressRow}><span>{label}</span><strong>{count}</strong></div><div className={s.progress}><span style={{width:`${dashboard.total?count/dashboard.total*100:0}%`}}/></div></div>;})}</div></section>
      <section className={s.card}><div className={s.cardHeader}><div><h2>Ringkasan dana</h2><p>Nominal yang tercatat di sistem ini</p></div></div><div className={s.cardBody}>{[["Bantuan ditetapkan",dashboard.approvedAmount],["Dana dicairkan",dashboard.disbursedAmount],["Bantuan tersalurkan",dashboard.completedAmount]].map(([label,value])=><div className={s.document} key={String(label)} style={{alignItems:"flex-start",flexDirection:"column",gap:5}}><span className={s.tiny}>{label}</span><strong style={{fontSize:21,fontWeight:600}}>{money(Number(value))}</strong></div>)}<p className={s.tiny} style={{marginTop:18}}>Bukan saldo rekening. Pencairan dilakukan manual oleh Bendahara.</p></div></section></div>}
      {tab==="pencairan"&&dashboard.tickets.length>0&&<section className={s.card}><div className={s.cardHeader}><div><h2>Tiket pencairan per penyalur</h2><p>Hanya dana yang telah ditandai disetujui</p></div></div><div className={s.cardBody}>{dashboard.tickets.map((t,i)=><div key={i} className={s.document}><div><strong>{t.distribution_type==="direct"?"Bendahara → penerima langsung":staff.find(p=>p.id===t.distributor_id)?.name??"Verifikator"}</strong><div className={s.tiny}>{t.total} penerima</div></div><strong>{money(Number(t.amount))}</strong></div>)}</div></section>}</>}
      <section className={s.card}><div className={s.cardHeader}><div><h2>{tab?listTitle[tab]:"Pengajuan terbaru"}</h2><p>{page?.total??0} pengajuan · diperbarui dari data operasional</p></div>{loading&&<span className={s.tiny} role="status">Memuat…</span>}</div>
        <div className={s.filters}><input className={`${s.input} ${s.search}`} placeholder="Cari nama atau nomor pengajuan…" aria-label="Cari pengajuan" value={search} onChange={e=>{setSearch(e.target.value);setNumber(1);}}/><select className={s.input} aria-label="Filter status" value={status} onChange={e=>{setStatus(e.target.value);setNumber(1);}}><option value="">{queueStates.length?"Semua pada tahap ini":"Semua status"}</option>{Object.entries(bantuanStatuses).filter(([v])=>!queueStates.length||queueStates.includes(v)).map(([v,label])=><option value={v} key={v}>{label}</option>)}</select><select className={s.input} aria-label="Filter program" value={program} onChange={e=>{setProgram(e.target.value);setNumber(1);}}><option value="">Semua program</option>{viewer.settings.programs.map(p=><option key={p}>{p}</option>)}</select></div>
        {page?.data.length?<><div className={s.desktopTable}><div className={s.tableWrap}><table className={s.table}><thead><tr>{batchOptions.length>0&&<th aria-label="Pilih pengajuan"/>}<th>Pemohon</th><th>Program / wilayah</th><th>Status</th><th>Nominal bantuan</th><th>Penyalur</th><th>Tanggal</th><th className={s.stickyAction}>Aksi</th></tr></thead><tbody>{page.data.map(row=><tr key={row.id}>{batchOptions.length>0&&<td><input className={s.check} type="checkbox" aria-label={`Pilih ${row.number}`} disabled={!batchOptions.some(a=>batchStates[a].includes(row.status))} checked={!!selected[row.id]} onChange={e=>setSelected(v=>({...v,[row.id]:e.target.checked}))}/></td>}<td><Link className={s.applicantLink} href={`/admin/bantuan/pengajuan/${row.id}`}><strong>{row.name}</strong></Link><small>{row.number}{row.source==="bypass"?" · Jalur langsung":""}</small></td><td>{row.program}<div className={s.tiny}>{row.region}</div></td><td><Badge status={row.status}/></td><td>{row.amount?money(row.amount):<span className={s.tiny}>Belum ditetapkan</span>}</td><td>{row.distributionType==="direct"?"Bendahara langsung":staff.find(p=>p.id===row.distributorId)?.name??"Belum ditetapkan"}</td><td>{day(row.createdAt)}</td><td className={s.stickyAction}><Link className={s.detailButton} href={`/admin/bantuan/pengajuan/${row.id}`} aria-label={`Buka detail ${row.name}`}>Detail <Icon name="arrow"/></Link></td></tr>)}</tbody></table></div></div><div className={s.mobileApplications}>{page.data.map(row=><article className={s.applicationCard} key={row.id}><div className={s.mobileCardHeading}><div><small>{row.number}</small><h3>{row.name}</h3></div><Badge status={row.status}/></div><p>{row.program} · {row.region}</p><div className={s.mobileCardBottom}><strong>{row.amount?money(row.amount):"Nominal belum ditetapkan"}</strong><Link className={s.detailButton} href={`/admin/bantuan/pengajuan/${row.id}`}>Detail <Icon name="arrow"/></Link></div>{batchOptions.length>0&&<label className={s.mobileSelect}><input className={s.check} type="checkbox" aria-label={`Pilih ${row.number}`} disabled={!batchOptions.some(a=>batchStates[a].includes(row.status))} checked={!!selected[row.id]} onChange={e=>setSelected(v=>({...v,[row.id]:e.target.checked}))}/> Pilih untuk tindakan massal</label>}</article>)}</div><div className={s.pagination}><span>Halaman {page.current_page} dari {page.last_page}</span><div className={s.actions}><button className={`${s.button} ${s.secondary}`} disabled={number<=1} onClick={()=>setNumber(v=>v-1)}>← Sebelumnya</button><button className={`${s.button} ${s.secondary}`} disabled={number>=page.last_page} onClick={()=>setNumber(v=>v+1)}>Berikutnya →</button></div></div></>:<div className={s.empty}><div className={s.avatar} style={{margin:"0 auto 15px"}}>✓</div><h3>{loading?"Memuat pengajuan…":queue?"Antrean tahap ini kosong":"Belum ada pengajuan di sini"}</h3><p>Pengajuan akan tampil sesuai tahap dan akses akun Anda.</p>{queue?<Link className={`${s.button} ${s.secondary}`} href="/admin/bantuan/pengajuan">Lihat semua pengajuan</Link>:canCreate&&<Link className={`${s.button} ${s.secondary}`} href={newHref}>Buat pengajuan baru</Link>}</div>}
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
    <section className={s.nextStep} aria-label="Langkah berikutnya"><span className={s.nextStepIcon}><Icon name="arrow"/></span><div><small>LANGKAH BERIKUTNYA</small><h2>{upcoming.title}</h2><p>{upcoming.description}</p></div><span className={s.nextOwner}>{upcoming.owner}</span></section>
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
