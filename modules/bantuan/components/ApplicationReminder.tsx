"use client";
import { createPortal } from "react-dom";
import { Dialog } from "./ui";
import { useState } from "react";
import { Bell, LoaderCircle, ExternalLink } from "lucide-react";
import type { AidApplication, BantuanViewer } from "@/contracts/modules/bantuan";
import { bantuanRoles } from "@/contracts/modules/bantuan";
import { hasAnyRole } from "../permissions";
import { request } from "../api/client";
import s from "./ApplicationReminder.module.css";
export const reminderTargets: Record<string,string> = {
  needs_data:"pembuat pengajuan", screening:"Call Center", review1:"Penyetuju Survei / Approver",
  survey_assignment:"Call Center", survey_assigned:"Verifikator", survey_cc_review:"Call Center",
  survey_submitted:"Approver", review2:"Approver", bypass_review:"Approver", approved:"Call Center",
  fund_ready:"Pengaju Dana", fund_submitted:"Pengaju Dana", fund_approved:"Bendahara",
  disbursed:"Penyalur", delivery_failed:"Bendahara",
};
type Result = {task:string;recipients:{id:string;name:string;url:string|null}[]};
type Choices = {task:string;recipients:{id:string;name:string;role:string;current:boolean;hasWhatsapp:boolean}[]};
export function ApplicationReminder({row,viewer}:{row:AidApplication;viewer:BantuanViewer}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const [result,setResult]=useState<Result|null>(null);
  const [choices,setChoices]=useState<Choices|null>(null),[selected,setSelected]=useState<string[]>([]),[note,setNote]=useState("");
  if(!hasAnyRole(viewer,["admin","call_center"])||!reminderTargets[row.status])return null;
  async function open(){
    setBusy(true);setError("");setResult(null);setChoices(null);setNote("");
    try{
      const data=await request<Choices>(`applications/${row.id}/reminder-recipients?status=${encodeURIComponent(row.status)}`);
      const current=data.recipients.filter(p=>p.current);
      const reviewStage=["review1","survey_submitted","review2","bypass_review"].includes(row.status);
      if(reviewStage||current.some(p=>["approver","chair"].includes(p.role))||current.length>1){
        setChoices({...data,recipients:reviewStage?data.recipients:current});setSelected(current.map(p=>p.id));
        return;
      }
      if(!current.length)throw new Error("Belum ada petugas aktif yang ditugaskan pada tahap ini.");
      if(!current[0].hasWhatsapp)throw new Error(`Nomor WhatsApp ${current[0].name} belum diisi. Minta admin melengkapinya.`);
      const prepared=await request<Result>(`applications/${row.id}/reminders`,{method:"POST",body:JSON.stringify({status:row.status,recipientIds:[current[0].id]})});
      const recipient=prepared.recipients.find(p=>p.id===current[0].id);
      if(!recipient?.url)throw new Error("Nomor WhatsApp petugas belum tersedia.");
      window.location.assign(recipient.url);
    }catch(e){setError(e instanceof Error?e.message:"Daftar petugas belum dapat dimuat.");}
    finally{setBusy(false);}
  }
  async function remind(){
    setBusy(true);setError("");
    try{setResult(await request<Result>(`applications/${row.id}/reminders`,{method:"POST",body:JSON.stringify({status:row.status,recipientIds:selected,note})}));setChoices(null);}
    catch(e){setError(e instanceof Error?e.message:"Pengingat belum berhasil dibuat.");}
    finally{setBusy(false);}
  }
  const close=()=>{if(!busy){setChoices(null);setResult(null);setError("");}};
  return <div className={s.root}>
    <button type="button" className={`${s.trigger} ${s.iconTrigger}`} disabled={busy} onClick={open} aria-label={busy?"Menyiapkan pengingat":`Ingatkan ${reminderTargets[row.status]} untuk ${row.name}`} title={busy?"Menyiapkan pengingat…":`Ingatkan ${reminderTargets[row.status]}`} aria-expanded={!!choices} aria-controls={choices?`reminder-${row.id}`:undefined}>{busy?<LoaderCircle size={17} className={s.spinner} aria-hidden="true"/>:<Bell size={17} aria-hidden="true"/>}</button>
    {(choices||result||error)&&createPortal(<Dialog className={s.reminderDialog} title={choices?"Pilih penerima pengingat":result?"Pengingat siap dikirim":"Pengingat belum tersedia"} description={`${row.name} · ${row.number}`} onClose={close}><div className={`${s.root} ${s.popup}`}>
    {error&&<p role="alert" className={s.error}>{error}</p>}
    {choices&&<div id={`reminder-${row.id}`}>
      <p className={s.task}>Tahap: <strong>{choices.task}</strong></p><div className={s.recipientList}>
      {choices.recipients.length===0&&<p>Belum ada petugas terkait yang aktif.</p>}
      {choices.recipients.map(p=><label key={p.id} className={s.choice}><input type="checkbox" disabled={busy} checked={selected.includes(p.id)} onChange={e=>setSelected(ids=>e.target.checked?[...ids,p.id]:ids.filter(id=>id!==p.id))}/><span><strong>{p.name}</strong><small>{bantuanRoles[p.role]??p.role} · {p.current?"Bertugas pada tahap ini":"Terlibat dalam pengajuan"}{!p.hasWhatsapp?" · WA belum diisi":""}</small></span></label>)}</div>
      <label className={s.note}>Catatan untuk petugas (opsional)<textarea value={note} maxLength={1000} rows={3} disabled={busy} onChange={e=>setNote(e.target.value)} placeholder="Contoh: mohon kabari perkembangan atau kendalanya."/></label>
      <div className={s.popupActions}><button type="button" className={s.cancel} disabled={busy} onClick={close}>Batal</button><button type="button" className={`${s.trigger} ${s.prepare}`} disabled={busy||selected.length===0} onClick={remind}>{busy?"Menyiapkan…":`Siapkan pesan (${selected.length})`}</button></div>
    </div>}
    {result&&<div className={s.ready}>
      <p role="status">Pengingat lonceng sudah disiapkan. Buka WhatsApp untuk memeriksa dan mengirim pesan.</p>
      {result.recipients.map(person=><div className={s.person} key={person.id}><span>{person.name}</span>{person.url?<a href={person.url} target="_blank" rel="noopener noreferrer">Buka WhatsApp<ExternalLink size={13}/></a>:<small>Nomor WA belum diisi</small>}</div>)}
      <small>Periksa pesan lalu tekan Kirim di WhatsApp. Status pengajuan tetap.</small>
      <button type="button" className={s.close} onClick={()=>setResult(null)}>Tutup rincian pengingat</button>
    </div>}
    </div></Dialog>,document.body)}
  </div>;
}
