"use client";
import { useState } from "react";
import { BellRing, ExternalLink } from "lucide-react";
import type { AidApplication, BantuanViewer } from "@/contracts/modules/bantuan";
import { bantuanRoles } from "@/contracts/modules/bantuan";
import { hasAnyRole } from "../permissions";
import { request } from "../api/client";
import s from "./ApplicationReminder.module.css";
export const reminderTargets: Record<string,string> = {
  needs_data:"pembuat pengajuan", screening:"Call Center", review1:"Approver",
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
    setBusy(true);setError("");setResult(null);
    try{
      const data=await request<Choices>(`applications/${row.id}/reminder-recipients?status=${encodeURIComponent(row.status)}`);
      setChoices(data);setSelected(data.recipients.filter(p=>p.current).map(p=>p.id));
    }catch(e){setError(e instanceof Error?e.message:"Daftar petugas belum dapat dimuat.");}
    finally{setBusy(false);}
  }
  async function remind(){
    setBusy(true);setError("");
    try{setResult(await request<Result>(`applications/${row.id}/reminders`,{method:"POST",body:JSON.stringify({status:row.status,recipientIds:selected,note})}));setChoices(null);}
    catch(e){setError(e instanceof Error?e.message:"Pengingat belum berhasil dibuat.");}
    finally{setBusy(false);}
  }
  return <div className={s.root}>
    <button type="button" className={s.trigger} disabled={busy} onClick={open}><BellRing size={16}/>{busy?"Menyiapkan pengingat…":"Ingatkan petugas"}</button>
    {error&&<p role="alert" className={s.error}>{error}</p>}
    {choices&&<div className={s.result}>
      <strong>Pilih penerima pengingat</strong><p>Tahap saat ini: {choices.task}</p>
      {choices.recipients.length===0&&<p>Belum ada petugas terkait yang aktif.</p>}
      {choices.recipients.map(p=><label key={p.id} className={s.choice}><input type="checkbox" disabled={busy} checked={selected.includes(p.id)} onChange={e=>setSelected(ids=>e.target.checked?[...ids,p.id]:ids.filter(id=>id!==p.id))}/><span><strong>{p.name}</strong><small>{bantuanRoles[p.role]??p.role} · {p.current?"Bertugas pada tahap ini":"Terlibat dalam pengajuan"}{!p.hasWhatsapp?" · WA belum diisi":""}</small></span></label>)}
      <label className={s.note}>Catatan untuk petugas (opsional)<textarea value={note} maxLength={1000} rows={3} disabled={busy} onChange={e=>setNote(e.target.value)} placeholder="Contoh: mohon kabari perkembangan atau kendalanya."/></label>
      <button type="button" className={s.trigger} disabled={busy||selected.length===0} onClick={remind}>Siapkan pengingat · {selected.length} petugas</button>
      <button type="button" className={s.close} disabled={busy} onClick={()=>setChoices(null)}>Batal</button>
    </div>}
    {result&&<div className={s.result}>
      <p role="status"><strong>Pengingat lonceng tersedia untuk petugas terkait.</strong><br/>Pengingat tahap yang sama dibatasi sekali sehari.</p>
      {result.recipients.map(person=><div className={s.person} key={person.id}><span>{person.name}</span>{person.url?<a href={person.url} target="_blank" rel="noopener noreferrer">Buka WhatsApp<ExternalLink size={13}/></a>:<small>Nomor WA belum diisi</small>}</div>)}
      <small>Periksa pesan lalu tekan Kirim di WhatsApp. Status pengajuan tetap.</small>
      <button type="button" className={s.close} onClick={()=>setResult(null)}>Tutup rincian pengingat</button>
    </div>}
  </div>;
}
