"use client";
/* eslint-disable @next/next/no-img-element -- evidence uses authenticated private URLs */

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import type { BantuanStaff, BantuanViewer, SantunanRecord } from "@/contracts/modules/bantuan";
import { day, money, request } from "../api/client";
import { preparePhoto } from "../api/photos";
import s from "./Workspace.module.css";
import d from "./Santunan.module.css";
import { HandHeart, Plus, Search, Wallet, CheckCircle2, Clock3, ChevronDown, RefreshCw, ImagePlus } from "lucide-react";
import { Button, Dialog, Toast } from "./ui";

const categoryLabels={widow:"Janda dhuafa",orphan:"Anak yatim",foster_child:"Anak asuh"};
const today=()=>new Date().toLocaleDateString("en-CA");

export function Santunan({viewer,staff}:{viewer:BantuanViewer;staff:BantuanStaff[]}){
  const [rows,setRows]=useState<SantunanRecord[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[busy,setBusy]=useState("");
  const [frequency,setFrequency]=useState(""),[distribution,setDistribution]=useState("");
  const [showCreate,setShowCreate]=useState(false),[expanded,setExpanded]=useState(""),[search,setSearch]=useState(""),[success,setSuccess]=useState("");
  const [confirm,setConfirm]=useState<SantunanRecord|null>(null),[preview,setPreview]=useState<{src:string;title:string}|null>(null);
  const volunteers=useMemo(()=>staff.filter(person=>person.role==="volunteer"&&person.active),[staff]);
  const load=useCallback(async()=>{setError("");try{const params=new URLSearchParams({...frequency?{frequency}:{},...distribution?{distributionStatus:distribution}:{}});setRows(await request<SantunanRecord[]>(`santunan?${params}`));}catch(e){setError(e instanceof Error?e.message:"Data santunan tidak dapat dimuat.");}finally{setLoading(false);}},[frequency,distribution]);
  useEffect(()=>{let live=true;const params=new URLSearchParams({...frequency?{frequency}:{},...distribution?{distributionStatus:distribution}:{}});request<SantunanRecord[]>(`santunan?${params}`).then(data=>{if(live){setRows(data);setLoading(false);}}).catch(err=>{if(live){setError(err instanceof Error?err.message:"Data santunan tidak dapat dimuat.");setLoading(false);}});return()=>{live=false;};},[frequency,distribution]);
  async function create(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy("create");setError("");const element=e.currentTarget,form=new FormData(element);try{await request("santunan",{method:"POST",body:JSON.stringify(Object.fromEntries(form))});element.reset();setShowCreate(false);await load();setSuccess("Santunan berhasil ditambahkan.");}catch(err){setError(err instanceof Error?err.message:"Santunan gagal dibuat.");}finally{setBusy("");}}
  async function markTransferred(row:SantunanRecord){setBusy(row.id);setError("");try{await request(`santunan/${row.id}/transferred`,{method:"POST",body:JSON.stringify({version:row.version,transferredAt:today()})});setConfirm(null);await load();setSuccess("Dana berhasil ditandai sudah ditransfer.");}catch(err){setError(err instanceof Error?err.message:"Status transfer gagal diperbarui.");}finally{setBusy("");}}
  async function report(e:FormEvent<HTMLFormElement>,row:SantunanRecord){e.preventDefault();setBusy(row.id);setError("");const form=new FormData(e.currentTarget);try{
    for(const kind of ["aid_paper","recipient_photo"]){const file=form.get(kind);if(file instanceof File&&file.size){const body=new FormData();body.set("kind",kind);body.set("file",await preparePhoto(file));await request(`santunan/${row.id}/documents`,{method:"POST",body});}}
    await request(`santunan/${row.id}/complete`,{method:"POST",body:JSON.stringify({version:row.version,distributionDate:form.get("distributionDate"),location:form.get("location"),recipient:form.get("recipient"),description:form.get("description")})});setExpanded("");await load();setSuccess("Laporan tersimpan. Penyaluran santunan selesai.");
  }catch(err){await load();setError(err instanceof Error?err.message:"Laporan penyaluran gagal disimpan.");}finally{setBusy("");}}
  const canManage=["admin","treasurer"].includes(viewer.role);
  const visible=rows.filter(row=>[row.recipientName,row.number,staff.find(person=>person.id===row.volunteerId)?.name].join(" ").toLowerCase().includes(search.trim().toLowerCase()));
  const pending=rows.filter(row=>row.transferStatus==="pending").length;
  const completed=rows.filter(row=>row.distributionStatus==="completed").length;
  return <div className={d.root}>
    <div className={s.heading}><div><div className={s.eyebrow}>SANTUNAN LAZSIP</div><h1>Santunan rutin & tidak rutin</h1><p>Catat bantuan, pantau transfer, dan lengkapi laporan penyaluran dalam satu tempat.</p></div><div className={s.actions}><Button variant="secondary" disabled={loading||!!busy} onClick={()=>void load()} aria-label="Muat ulang santunan"><RefreshCw size={15}/></Button>{canManage&&<Button onClick={()=>setShowCreate(value=>!value)}><Plus size={16}/>{showCreate?"Tutup form":"Tambah santunan"}</Button>}</div></div>
    <div className={d.stats}>{[
      {label:"Total santunan",value:rows.length,hint:"Sesuai filter & akses Anda",icon:HandHeart},
      {label:"Menunggu transfer",value:pending,hint:"Dana belum ditandai dikirim",icon:Wallet},
      {label:"Dalam penyaluran",value:rows.length-pending-completed,hint:"Dana sudah diterima relawan",icon:Clock3},
      {label:"Penyaluran selesai",value:completed,hint:"Laporan dan bukti lengkap",icon:CheckCircle2},
    ].map(stat=><div className={d.stat} key={stat.label}><div><span>{stat.label}</span><stat.icon size={17}/></div><strong>{stat.value}</strong><small>{stat.hint}</small></div>)}</div>
    {error&&<div className={s.notice+" "+s.error} role="alert"><span>{error}</span><button type="button" onClick={()=>setError("")} aria-label="Tutup pesan">×</button></div>}
    {canManage&&<section className={s.card+" "+d.createCard} hidden={!showCreate}><div className={s.cardHeader}><div><h2>Tambahkan santunan</h2><p>Isi penerima, periode, nominal, dan relawan penyalur.</p></div><span className={s.pill}>Data baru</span></div><form className={s.cardBody} onSubmit={create}><div className={s.formGrid}>
      <label className={s.field}>Jenis santunan<select className={s.input} name="frequency" required><option value="routine">Rutin</option><option value="non_routine">Tidak rutin</option></select></label>
      <label className={s.field}>Kategori<select className={s.input} name="category" required><option value="widow">Janda dhuafa</option><option value="orphan">Anak yatim</option><option value="foster_child">Anak asuh</option></select><small>Tidak rutin khusus kategori anak yatim.</small></label>
      <label className={s.field}>Periode<input className={s.input} name="period" type="month" defaultValue={today().slice(0,7)} required/></label>
      <label className={s.field}>Nama penerima<input className={s.input} name="recipientName" maxLength={191} placeholder="Nama lengkap penerima" required/></label>
      <label className={s.field}>Relawan penyalur<select className={s.input} name="volunteerId" required><option value="">Pilih relawan</option>{volunteers.map(person=><option value={person.id} key={person.id}>{person.name}</option>)}</select></label>
      <label className={s.field}>Nominal (Rp)<input className={s.input} name="amount" type="number" min={1} placeholder="Contoh: 300000" required/></label>
    </div>{!volunteers.length&&<p className={s.notice}>Tambahkan akun Relawan pada menu Tim & akses terlebih dahulu.</p>}<div className={d.formActions}><Button type="button" variant="secondary" disabled={!!busy} onClick={()=>setShowCreate(false)}>Batal</Button><Button disabled={!!busy||!volunteers.length}>{busy==="create"?"Menyimpan…":"Simpan santunan"}</Button></div></form></section>}
    <section className={d.listSection} aria-label="Daftar santunan">
      <div className={d.listHeading}><div><h2>Daftar santunan</h2><p>{visible.length} catatan sesuai akses akun</p></div><span className={s.pill}>Transfer → Penyaluran → Selesai</span></div>
      <div className={d.filters}><label className={d.search}><Search size={16}/><input aria-label="Cari santunan" placeholder="Cari penerima, nomor, atau relawan…" value={search} onChange={e=>setSearch(e.target.value)}/></label><select className={s.input} aria-label="Filter jenis santunan" value={frequency} onChange={e=>setFrequency(e.target.value)}><option value="">Semua jenis</option><option value="routine">Rutin</option><option value="non_routine">Tidak rutin</option></select><select className={s.input} aria-label="Filter status penyaluran" value={distribution} onChange={e=>setDistribution(e.target.value)}><option value="">Semua status penyaluran</option><option value="process">Proses</option><option value="completed">Sudah</option></select></div>
      {loading?<div className={s.skeleton} role="status">Memuat santunan…</div>:visible.length?<div className={d.cards}>{visible.map(row=><article className={d.card} key={row.id}>
        <div className={d.cardTop}><span className={d.category}><HandHeart size={15}/>{categoryLabels[row.category]}</span><span className={d.period}>{row.period} · {row.frequency==="routine"?"Rutin":"Tidak rutin"}</span></div>
        <h3>{row.recipientName}</h3><p className={d.number}>{row.number}</p><strong className={d.amount}>{money(row.amount)}</strong>
        <div className={d.statuses}><div><small>Pengiriman dana</small><span className={s.badge+" "+(row.transferStatus==="transferred"?s.green:s.amber)}>{row.transferStatus==="transferred"?"Sudah ditransfer":"Belum ditransfer"}</span></div><div><small>Penyaluran</small><span className={s.badge+" "+(row.distributionStatus==="completed"?s.green:s.blue)}>{row.distributionStatus==="completed"?"Selesai":"Proses"}</span></div></div>
        <div className={d.volunteer}><span>Relawan penyalur</span><strong>{staff.find(person=>person.id===row.volunteerId)?.name??"Akun tidak ditemukan"}</strong></div>
        <div className={d.cardActions}>{canManage&&row.transferStatus==="pending"&&<Button disabled={!!busy} onClick={()=>setConfirm(row)}><Wallet size={15}/>Tandai sudah ditransfer</Button>}<Button variant="secondary" aria-expanded={expanded===row.id} aria-controls={"santunan-detail-"+row.id} onClick={()=>setExpanded(current=>current===row.id?"":row.id)}>{(viewer.role==="admin"||viewer.role==="volunteer"&&viewer.id===row.volunteerId)&&row.transferStatus==="transferred"&&row.distributionStatus==="process"?"Isi laporan":"Lihat rincian"}<ChevronDown size={15}/></Button></div>
        <div id={"santunan-detail-"+row.id} className={d.details} hidden={expanded!==row.id}>
          <p className={d.detailNote}>{row.transferStatus==="pending"?"Laporan penyaluran dapat diisi setelah dana ditandai sudah ditransfer.":row.distributionStatus==="completed"?"Laporan penyaluran sudah lengkap.":"Dana sudah ditransfer. Lengkapi laporan penyaluran dan dua foto bukti."}</p>
          {(viewer.role==="admin"||viewer.role==="volunteer"&&viewer.id===row.volunteerId)&&row.transferStatus==="transferred"&&row.distributionStatus==="process"&&<form onSubmit={e=>void report(e,row)}><div className={s.formGrid}>
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
    {confirm&&<Dialog title="Tandai dana sudah ditransfer?" description={"Pastikan transfer "+money(confirm.amount)+" untuk "+confirm.recipientName+" sudah dilakukan. Tindakan ini hanya mencatat status, bukan mengirim uang."} onClose={()=>!busy&&setConfirm(null)}><div className={d.formActions}><Button variant="secondary" disabled={!!busy} onClick={()=>setConfirm(null)}>Batal</Button><Button disabled={!!busy} onClick={()=>void markTransferred(confirm)}>{busy?"Menyimpan…":"Ya, sudah ditransfer"}</Button></div>{error&&<p role="alert" className={s.fieldError}>{error}</p>}</Dialog>}
    {preview&&<Dialog title={preview.title} onClose={()=>setPreview(null)} wide><img className={s.largePhoto} src={preview.src} alt={preview.title}/></Dialog>}
    {success&&<Toast message={success} onClose={()=>setSuccess("")}/>}
  </div>;
}
