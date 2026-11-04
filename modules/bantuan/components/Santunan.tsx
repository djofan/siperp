"use client";
import { hasRole, hasAnyRole } from "../permissions";
/* eslint-disable @next/next/no-img-element -- evidence uses authenticated private URLs */

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { santunanCategoryLabels } from "@/contracts/modules/bantuan";
import type { BantuanStaff, BantuanViewer, SantunanRecord } from "@/contracts/modules/bantuan";
import { day, money, request } from "../api/client";
import { preparePhoto } from "../api/photos";
import s from "./Workspace.module.css";
import d from "./Santunan.module.css";
import { PageGuide } from "./PageGuide";
import { LoadingState } from "./LoadingState";
import { HandHeart, Plus, Search, Wallet, CheckCircle2, Clock3, ChevronDown, RefreshCw, ImagePlus } from "lucide-react";
import { Button, Dialog, Toast } from "./ui";
import { SantunanCard } from "./SantunanCard";
import ft from "./ListTools.module.css";
import { selectedPendingSantunan, transferSantunanSelection } from "../santunan-transfer";

const categoryLabels=santunanCategoryLabels;
const today=()=>new Date().toLocaleDateString("en-CA");

export function Santunan({viewer,staff}:{viewer:BantuanViewer;staff:BantuanStaff[]}){
  const [rows,setRows]=useState<SantunanRecord[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[busy,setBusy]=useState("");
  const [createFrequency,setCreateFrequency]=useState("routine");
  const [frequency,setFrequency]=useState(""),[distribution,setDistribution]=useState("");
  const [filters,setFilters]=useState({category:"",transfer:"",volunteer:"",periodFrom:"",periodTo:"",amountMin:"",amountMax:"",sort:"period"});
  const [showCreate,setShowCreate]=useState(false),[expanded,setExpanded]=useState(""),[search,setSearch]=useState(""),[success,setSuccess]=useState("");
  const [confirm,setConfirm]=useState<SantunanRecord|null>(null),[preview,setPreview]=useState<{src:string;title:string}|null>(null);
  const [card,setCard]=useState<SantunanRecord|null>(null);
  const [showPeriod,setShowPeriod]=useState(false);
  const [selected,setSelected]=useState<string[]>([]);
  const [bulkConfirm,setBulkConfirm]=useState<SantunanRecord[]|null>(null);
  const routinePeriods=Array.from(new Set(rows.filter(row=>row.frequency==="routine").map(row=>row.period))).sort().reverse();
  const volunteers=useMemo(()=>staff.filter(person=>(person.roles??[person.role]).includes("volunteer")&&person.active),[staff]);
  const load=useCallback(async()=>{setError("");try{setRows(await request<SantunanRecord[]>("santunan"));}catch(e){setError(e instanceof Error?e.message:"Data santunan tidak dapat dimuat.");}finally{setLoading(false);}},[]);
  useEffect(()=>{let live=true;const controller=new AbortController();request<SantunanRecord[]>("santunan",{signal:controller.signal}).then(data=>{if(live){setRows(data);setLoading(false);}}).catch(err=>{if(live){setError(err instanceof Error?err.message:"Data santunan tidak dapat dimuat.");setLoading(false);}});return()=>{live=false;controller.abort();};},[]);
  async function create(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy("create");setError("");const element=e.currentTarget,form=new FormData(element);try{await request("santunan",{method:"POST",body:JSON.stringify(Object.fromEntries(form))});element.reset();setCreateFrequency("routine");setShowCreate(false);await load();setSuccess("Santunan berhasil ditambahkan.");}catch(err){setError(err instanceof Error?err.message:"Santunan gagal dibuat.");}finally{setBusy("");}}
  async function nextPeriod(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy("period");setError("");const form=new FormData(e.currentTarget);try{
    const result=await request<{period:string;createdCount:number}>("santunan/periods",{method:"POST",body:JSON.stringify({sourcePeriod:form.get("sourcePeriod")})});
    await load();reset();setFrequency("routine");setFilters(current=>({...current,periodFrom:result.period,periodTo:result.period}));setShowPeriod(false);setSuccess(`${result.createdCount} santunan rutin dibuat untuk ${result.period}.`);
  }catch(err){setError(err instanceof Error?err.message:"Periode baru gagal dibuat.");}finally{setBusy("");}}
  async function markTransferred(row:SantunanRecord){setBusy(row.id);setError("");try{await request(`santunan/${row.id}/transferred`,{method:"POST",body:JSON.stringify({version:row.version,transferredAt:today()})});setConfirm(null);await load();setSuccess("Dana berhasil ditandai sudah ditransfer.");}catch(err){setError(err instanceof Error?err.message:"Status transfer gagal diperbarui.");}finally{setBusy("");}}
  async function markSelectedTransferred(){
    if(!bulkConfirm?.length)return;
    setBusy("bulk-transfer");setError("");
    try{
      const result=await transferSantunanSelection(bulkConfirm,row=>request(`santunan/${row.id}/transferred`,{method:"POST",body:JSON.stringify({version:row.version,transferredAt:today()})}));
      setSelected([]);setBulkConfirm(null);await load();
      if(result.error)setError(`${result.completed} dari ${bulkConfirm.length} santunan berhasil dicatat. Proses dihentikan: ${result.error} Muat ulang daftar sebelum mencoba lagi.`);
      else setSuccess(`${result.completed} santunan berhasil ditandai sudah ditransfer.`);
    }finally{setBusy("");}
  }
  async function report(e:FormEvent<HTMLFormElement>,row:SantunanRecord){e.preventDefault();setBusy(row.id);setError("");const form=new FormData(e.currentTarget);try{
    for(const kind of ["aid_paper","recipient_photo"]){const file=form.get(kind);if(file instanceof File&&file.size){const body=new FormData();body.set("kind",kind);body.set("file",await preparePhoto(file));await request(`santunan/${row.id}/documents`,{method:"POST",body});}}
    await request(`santunan/${row.id}/complete`,{method:"POST",body:JSON.stringify({version:row.version,distributionDate:form.get("distributionDate"),location:form.get("location"),recipient:form.get("recipient"),description:form.get("description")})});setExpanded("");await load();setSuccess("Laporan tersimpan. Penyaluran santunan selesai.");
  }catch(err){await load();setError(err instanceof Error?err.message:"Laporan penyaluran gagal disimpan.");}finally{setBusy("");}}
  const canManage=hasAnyRole(viewer,["admin","treasurer"]);
  const visible=rows.filter(row=>[row.recipientName,row.number,staff.find(person=>person.id===row.volunteerId)?.name].join(" ").toLowerCase().includes(search.trim().toLowerCase())&&(!frequency||row.frequency===frequency)&&(!distribution||row.distributionStatus===distribution)&&(!filters.category||row.category===filters.category)&&(!filters.transfer||row.transferStatus===filters.transfer)&&(!filters.volunteer||row.volunteerId===filters.volunteer)&&(!filters.periodFrom||row.period>=filters.periodFrom)&&(!filters.periodTo||row.period<=filters.periodTo)&&(!filters.amountMin||row.amount>=Number(filters.amountMin))&&(!filters.amountMax||row.amount<=Number(filters.amountMax))).sort((a,b)=>filters.sort==="amount_high"?b.amount-a.amount:filters.sort==="amount_low"?a.amount-b.amount:filters.sort==="name"?a.recipientName.localeCompare(b.recipientName,"id"):b.period.localeCompare(a.period));
  const selectable=canManage?visible.filter(row=>row.transferStatus==="pending"):[];
  const selectedRows=selectedPendingSantunan(selectable,selected);
  const allSelected=selectable.length>0&&selectedRows.length===selectable.length;
  const pending=visible.filter(row=>row.transferStatus==="pending").length;
  const completed=visible.filter(row=>row.distributionStatus==="completed").length;
  const reset=()=>{setFrequency("");setDistribution("");setSearch("");setFilters({category:"",transfer:"",volunteer:"",periodFrom:"",periodTo:"",amountMin:"",amountMax:"",sort:"period"});};
  return <div className={d.root}>
    <div className={s.heading}><div><div className={s.eyebrow}>SANTUNAN LAZSIP</div><h1>Santunan rutin & tidak rutin</h1><p>Catat bantuan, pantau transfer, dan lengkapi laporan penyaluran dalam satu tempat.</p></div><div className={s.actions}><Button variant="secondary" disabled={loading||!!busy} onClick={()=>void load()} aria-label="Muat ulang santunan"><RefreshCw size={15}/></Button>{canManage&&routinePeriods.length>0&&<Button variant="secondary" disabled={!!busy||loading} onClick={()=>{setError("");setShowPeriod(true);}}>Buat periode bulan berikutnya</Button>}{canManage&&<Button onClick={()=>setShowCreate(value=>!value)}><Plus size={16}/>{showCreate?"Tutup form":"Tambah santunan"}</Button>}</div></div>
    <div className={d.stats}>{[
      {label:"Total santunan",value:visible.length,hint:"Sesuai filter & akses Anda",icon:HandHeart},
      {label:"Menunggu transfer",value:pending,hint:"Dana belum ditandai dikirim",icon:Wallet},
      {label:"Dalam penyaluran",value:visible.length-pending-completed,hint:"Dana sudah diterima penyalur",icon:Clock3},
      {label:"Penyaluran selesai",value:completed,hint:"Laporan dan bukti lengkap",icon:CheckCircle2},
    ].map(stat=><div className={d.stat} key={stat.label}><div><span>{stat.label}</span><stat.icon size={17}/></div><strong>{loading?"—":stat.value}</strong><small>{stat.hint}</small></div>)}</div>
    <PageGuide title="Cara mencatat dan menyelesaikan santunan" steps={canManage?["Tambah santunan: tentukan penerima, kategori, nominal, dan penyalur.","Setelah transfer dilakukan, tekan Tandai sudah ditransfer. Tombol ini hanya mencatat, bukan mengirim uang.","Penyalur membuka santunan, mengisi laporan, dan mengunggah dua foto bukti untuk menyelesaikan proses."]:["Buka santunan yang ditugaskan kepada Anda.","Setelah dana ditandai ditransfer, tekan Isi laporan.","Isi tanggal dan lokasi, unggah foto kertas bantuan serta foto bersama penerima, lalu simpan laporan."]}/>
    {error&&<div className={s.notice+" "+s.error} role="alert"><span>{error}</span><button type="button" onClick={()=>setError("")} aria-label="Tutup pesan">×</button></div>}
    {canManage&&<section className={s.card+" "+d.createCard} hidden={!showCreate}><div className={s.cardHeader}><div><h2>Tambahkan santunan</h2><p>Isi penerima, periode, nominal, dan penyalur.</p></div><span className={s.pill}>Data baru</span></div><form className={s.cardBody} onSubmit={create}><div className={s.formGrid}>
      <label className={s.field}>Jenis santunan<select className={s.input} name="frequency" value={createFrequency} onChange={e=>setCreateFrequency(e.target.value)} required><option value="routine">Rutin</option><option value="non_routine">Tidak rutin</option></select></label>
      <label className={s.field}>Kategori<select key={createFrequency} className={s.input} name="category" required>{Object.entries(categoryLabels).filter(([key])=>createFrequency==="routine"||key==="orphan").map(([key,label])=><option key={key} value={key}>{label}</option>)}</select><small>Tidak rutin khusus kategori anak yatim.</small></label>
      <label className={s.field}>Periode<input className={s.input} name="period" type="month" defaultValue={today().slice(0,7)} required/></label>
      <label className={s.field}>Nama penerima<input className={s.input} name="recipientName" maxLength={191} placeholder="Nama lengkap penerima" required/></label>
      <label className={s.field}>Penyalur<select className={s.input} name="volunteerId" required><option value="">Pilih penyalur</option>{volunteers.map(person=><option value={person.id} key={person.id}>{person.name}</option>)}</select></label>
      <label className={s.field}>Nominal (Rp)<input className={s.input} name="amount" type="number" min={1} placeholder="Contoh: 300000" required/></label>
    </div>{!volunteers.length&&<p className={s.notice}>Tambahkan akun Penyalur pada menu Tim & akses terlebih dahulu.</p>}<div className={d.formActions}><Button type="button" variant="secondary" disabled={!!busy} onClick={()=>setShowCreate(false)}>Batal</Button><Button disabled={!!busy||!volunteers.length}>{busy==="create"?"Menyimpan…":"Simpan santunan"}</Button></div></form></section>}
    <section className={d.listSection} aria-label="Daftar santunan">
      <div className={d.listHeading}><div><h2>Daftar santunan</h2><p>{loading?"Menyiapkan daftar santunan…":`${visible.length} catatan sesuai akses akun`}</p></div><span className={s.pill}>Transfer → Penyaluran → Selesai</span></div>
      <div className={d.filters}><label className={d.search}><Search size={16}/><input aria-label="Cari santunan" placeholder="Cari penerima, nomor, atau penyalur…" value={search} onChange={e=>setSearch(e.target.value)}/></label><select className={s.input} aria-label="Filter jenis santunan" value={frequency} onChange={e=>setFrequency(e.target.value)}><option value="">Semua jenis</option><option value="routine">Rutin</option><option value="non_routine">Tidak rutin</option></select><select className={s.input} aria-label="Filter status penyaluran" value={distribution} onChange={e=>setDistribution(e.target.value)}><option value="">Semua status penyaluran</option><option value="process">Proses</option><option value="completed">Sudah</option></select></div>
      <details className={ft.advanced}><summary style={{fontSize:12,color:"#668652",cursor:"pointer"}}>Filter kategori, penyalur, periode & nominal</summary><div className={ft.auxiliary} style={{padding:"20px 0 0"}}>
        <label>Kategori penerima<select value={filters.category} onChange={e=>setFilters(current=>({...current,category:e.target.value}))}><option value="">Semua kategori</option>{Object.entries(categoryLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label><label>Status transfer<select value={filters.transfer} onChange={e=>setFilters(current=>({...current,transfer:e.target.value}))}><option value="">Semua transfer</option><option value="pending">Belum ditransfer</option><option value="transferred">Sudah ditransfer</option></select></label><label>Penyalur<select value={filters.volunteer} onChange={e=>setFilters(current=>({...current,volunteer:e.target.value}))}><option value="">Semua penyalur</option>{staff.filter(person=>(person.roles??[person.role]).includes("volunteer")||rows.some(row=>row.volunteerId===person.id)).map(person=><option key={person.id} value={person.id}>{person.name}</option>)}</select></label><label>Dari periode<input type="month" value={filters.periodFrom} onChange={e=>setFilters(current=>({...current,periodFrom:e.target.value}))}/></label><label>Sampai periode<input type="month" value={filters.periodTo} min={filters.periodFrom||undefined} onChange={e=>setFilters(current=>({...current,periodTo:e.target.value}))}/></label><label>Nominal minimal (Rp)<input type="number" min={0} value={filters.amountMin} onChange={e=>setFilters(current=>({...current,amountMin:e.target.value}))} placeholder="Tanpa batas"/></label><label>Nominal maksimal (Rp)<input type="number" min={0} value={filters.amountMax} onChange={e=>setFilters(current=>({...current,amountMax:e.target.value}))} placeholder="Tanpa batas"/></label><label>Urutkan<select value={filters.sort} onChange={e=>setFilters(current=>({...current,sort:e.target.value}))}><option value="period">Periode terbaru</option><option value="amount_high">Nominal terbesar</option><option value="amount_low">Nominal terkecil</option><option value="name">Nama A–Z</option></select></label><button type="button" onClick={reset}>Reset semua filter</button>
      </div></details>
      {!loading&&<p className={ft.resultNote} style={{padding:"14px 0 0"}}>{visible.length} dari {rows.length} santunan sesuai filter · ringkasan di atas mengikuti hasil ini</p>}
      {canManage&&!loading&&selectable.length>0&&<div className={d.bulkToolbar}>
        <label><input type="checkbox" checked={allSelected} disabled={!!busy} onChange={e=>setSelected(e.target.checked?selectable.map(row=>row.id):[])}/> Pilih semua yang belum ditransfer sesuai filter ({selectable.length})</label>
        <span>{selectedRows.length} dipilih · {money(selectedRows.reduce((sum,row)=>sum+row.amount,0))}</span>
        <Button disabled={!!busy||!selectedRows.length} onClick={()=>{setError("");setBulkConfirm([...selectedRows]);}}>Santunan telah ditransfer ({selectedRows.length})</Button>
      </div>}
      {loading?<LoadingState variant="cards" label="Memuat daftar santunan…"/>:error&&!rows.length?<div className={d.empty}><h3>Daftar santunan belum dapat dimuat</h3><p>Periksa koneksi dan coba lagi.</p><Button variant="secondary" onClick={()=>void load()}>Coba lagi</Button></div>:visible.length?<div className={d.cards}>{visible.map(row=><article className={d.card} key={row.id}>
        <div className={d.cardTop}><span className={d.category}><HandHeart size={15}/>{categoryLabels[row.category]}</span><span className={d.period}>{row.period} · {row.frequency==="routine"?"Rutin":"Tidak rutin"}</span></div>
        {canManage&&row.transferStatus==="pending"&&<label className={d.selectRecipient}><input type="checkbox" aria-label={"Pilih "+row.recipientName+" periode "+row.period} checked={selectedRows.some(item=>item.id===row.id)} disabled={!!busy} onChange={e=>setSelected(current=>e.target.checked?[...new Set([...current,row.id])]:current.filter(id=>id!==row.id))}/> Pilih penerima</label>}
        <h3>{row.recipientName}</h3><p className={d.number}>{row.number}</p><strong className={d.amount}>{money(row.amount)}</strong>
        <div className={d.statuses}><div><small>Pengiriman dana</small><span className={s.badge+" "+(row.transferStatus==="transferred"?s.green:s.amber)}>{row.transferStatus==="transferred"?"Sudah ditransfer":"Belum ditransfer"}</span></div><div><small>Penyaluran</small><span className={s.badge+" "+(row.distributionStatus==="completed"?s.green:s.blue)}>{row.distributionStatus==="completed"?"Selesai":"Proses"}</span></div></div>
        <div className={d.volunteer}><span>Verifikator / Relawan penyalur</span><strong>{staff.find(person=>person.id===row.volunteerId)?.name??"Akun tidak ditemukan"}</strong></div>
        <div className={d.cardActions}>{row.frequency==="routine"&&<Button variant="secondary" onClick={()=>setCard(row)}>Cetak kertas bantuan</Button>}{canManage&&row.transferStatus==="pending"&&<Button disabled={!!busy} onClick={()=>setConfirm(row)}><Wallet size={15}/>Tandai sudah ditransfer</Button>}<Button variant="secondary" aria-expanded={expanded===row.id} aria-controls={"santunan-detail-"+row.id} onClick={()=>setExpanded(current=>current===row.id?"":row.id)}>{(hasRole(viewer,"admin")||hasRole(viewer,"volunteer")&&viewer.id===row.volunteerId)&&row.transferStatus==="transferred"&&row.distributionStatus==="process"?"Isi laporan":"Buka santunan"}<ChevronDown size={15}/></Button></div>
        <div id={"santunan-detail-"+row.id} className={d.details} hidden={expanded!==row.id}>
          <p className={d.detailNote}>{row.transferStatus==="pending"?"Laporan penyaluran dapat diisi setelah dana ditandai sudah ditransfer.":row.distributionStatus==="completed"?"Laporan penyaluran sudah lengkap.":"Dana sudah ditransfer. Lengkapi laporan penyaluran dan dua foto bukti."}</p>
          {(hasRole(viewer,"admin")||hasRole(viewer,"volunteer")&&viewer.id===row.volunteerId)&&row.transferStatus==="transferred"&&row.distributionStatus==="process"&&<form onSubmit={e=>void report(e,row)}><div className={s.formGrid}>
            <label className={s.field}>Tanggal penyaluran<input className={s.input} name="distributionDate" type="date" defaultValue={today()} max={today()} required/></label>
            <label className={s.field}>Lokasi penyaluran<input className={s.input} name="location" placeholder="Lokasi penyerahan bantuan" maxLength={500} required/></label>
            <label className={s.field}>Nama penerima<input className={s.input} name="recipient" defaultValue={row.recipientName} maxLength={191} required/></label>
            <label className={s.field}>Deskripsi penyaluran<textarea className={s.input} name="description" placeholder="Ceritakan pelaksanaan penyaluran…" minLength={5} maxLength={5000} required/></label>
            {!row.documents.some(doc=>doc.kind==="aid_paper")&&<label className={d.photoUpload}><ImagePlus size={22}/><strong>Foto kertas bantuan</strong><small>Wajib · JPG, PNG, atau WEBP</small><input name="aid_paper" type="file" accept="image/jpeg,image/png,image/webp" required/></label>}
            {!row.documents.some(doc=>doc.kind==="recipient_photo")&&<label className={d.photoUpload}><ImagePlus size={22}/><strong>Foto bersama penerima</strong><small>Wajib · JPG, PNG, atau WEBP</small><input name="recipient_photo" type="file" accept="image/jpeg,image/png,image/webp" required/></label>}
          </div><div className={d.formActions}><Button disabled={!!busy}>{busy===row.id?"Menyimpan…":"Simpan laporan & selesaikan"}</Button></div></form>}
          {row.report&&<dl className={d.report}><div><dt>Tanggal penyaluran</dt><dd>{day(row.report.distributionDate)}</dd></div><div><dt>Penerima</dt><dd>{row.report.recipient}</dd></div><div><dt>Lokasi</dt><dd>{row.report.location}</dd></div><div><dt>Deskripsi</dt><dd>{row.report.description}</dd></div></dl>}
          {row.documents.length>0&&<div className={d.evidence}>{row.documents.map(doc=><button type="button" key={doc.id} onClick={()=>setPreview({src:"/api/bantuan/santunan-documents/"+doc.id,title:doc.kind==="aid_paper"?"Foto kertas bantuan":"Foto bersama penerima"})}><img src={"/api/bantuan/santunan-documents/"+doc.id} alt={doc.kind==="aid_paper"?"Foto kertas bantuan":"Foto bersama penerima"}/><span>{doc.kind==="aid_paper"?"Foto kertas bantuan":"Foto bersama penerima"}</span></button>)}</div>}
        </div>
      </article>)}</div>:<div className={d.empty}><HandHeart size={34} strokeWidth={1.3}/><h3>{rows.length?"Tidak ada hasil yang cocok":"Belum ada santunan"}</h3><p>{rows.length?"Coba kata pencarian atau filter yang lain.":canManage?"Tambahkan catatan santunan untuk memulai proses penyaluran.":"Catatan santunan yang ditugaskan kepada Anda akan tampil di sini."}</p>{canManage&&!rows.length&&<Button onClick={()=>setShowCreate(true)}><Plus size={15}/>Tambah santunan</Button>}</div>}
    </section>
    {showPeriod&&<Dialog title="Buat periode bulan berikutnya" description="Seluruh santunan rutin pada bulan sumber akan disalin ke bulan berikutnya, termasuk penerima, kategori, penyalur, dan nominal. Status kembali Belum ditransfer / Proses; laporan dan foto tidak disalin. Filter daftar tidak membatasi penerima yang disalin." onClose={()=>!busy&&setShowPeriod(false)}><form onSubmit={nextPeriod}><label className={s.field}>Periode sumber<select className={s.input} name="sourcePeriod" required disabled={!!busy}>{routinePeriods.map(period=><option key={period} value={period}>{period}</option>)}</select></label><p>Jika santunan rutin bulan tujuan sudah ada, penyalinan akan ditolak untuk mencegah data ganda. Riwayat bulan sumber tetap tersimpan.</p>{error&&<p role="alert" className={s.fieldError}>{error}</p>}<div className={d.formActions}><Button type="button" variant="secondary" disabled={!!busy} onClick={()=>setShowPeriod(false)}>Batal</Button><Button disabled={!!busy}>{busy==="period"?"Membuat…":"Buat periode bulan berikutnya"}</Button></div></form></Dialog>}
    {bulkConfirm&&<Dialog title="Catat transfer santunan terpilih?" description={`${bulkConfirm.length} santunan dengan total ${money(bulkConfirm.reduce((sum,row)=>sum+row.amount,0))} akan ditandai sudah ditransfer. Pastikan seluruh transfer tersebut benar-benar sudah dilakukan. Tombol ini hanya mencatat status, bukan mengirim uang.`} onClose={()=>!busy&&setBulkConfirm(null)}><p>Jika ada catatan yang gagal, proses berhenti. Catatan yang sudah berhasil tetap tersimpan.</p><div className={d.formActions}><Button variant="secondary" disabled={!!busy} onClick={()=>setBulkConfirm(null)}>Batal</Button><Button disabled={!!busy} onClick={()=>void markSelectedTransferred()}>{busy?"Mencatat transfer…":"Ya, semua sudah ditransfer"}</Button></div></Dialog>}
    {confirm&&<Dialog title="Tandai dana sudah ditransfer?" description={"Pastikan transfer "+money(confirm.amount)+" untuk "+confirm.recipientName+" sudah dilakukan. Tindakan ini hanya mencatat status, bukan mengirim uang."} onClose={()=>!busy&&setConfirm(null)}><div className={d.formActions}><Button variant="secondary" disabled={!!busy} onClick={()=>setConfirm(null)}>Batal</Button><Button disabled={!!busy} onClick={()=>void markTransferred(confirm)}>{busy?"Menyimpan…":"Ya, sudah ditransfer"}</Button></div>{error&&<p role="alert" className={s.fieldError}>{error}</p>}</Dialog>}
    {card&&<SantunanCard row={card} verifier={staff.find(person=>person.id===card.volunteerId)?.name??(card.volunteerId===viewer.id?viewer.name:"")} onClose={()=>setCard(null)}/>}
    {preview&&<Dialog title={preview.title} onClose={()=>setPreview(null)} wide><img className={s.largePhoto} src={preview.src} alt={preview.title}/></Dialog>}
    {success&&<Toast message={success} onClose={()=>setSuccess("")}/>}
  </div>;
}
