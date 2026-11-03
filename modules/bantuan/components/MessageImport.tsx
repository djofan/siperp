"use client";
import { useState } from "react";
import type { AidValues } from "@/contracts/modules/bantuan";
import { parseWhatsappMessage, type MessageImport as Parsed } from "../whatsapp-import";
import s from "./MessageImport.module.css";

export function MessageImport({applicant,survey,labels,onApply}:{applicant:AidValues;survey?:AidValues;labels:Record<string,string>;onApply:(value:Parsed)=>void}){
  const [text,setText]=useState(""),[preview,setPreview]=useState<Parsed|null>(null),[replace,setReplace]=useState(false),[notice,setNotice]=useState("");
  const entries=preview?[...Object.entries(preview.applicant).map(([k,v])=>({group:"applicant",k,v})),...(survey?Object.entries(preview.survey).map(([k,v])=>({group:"survey",k,v})):[])]:[];
  const current=(group:string,k:string)=>group==="applicant"?applicant[k]:survey?.[k];
  const occupied=(group:string,k:string)=>current(group,k)!==undefined&&current(group,k)!==null&&current(group,k)!=="";
  function apply(){
    if(!preview)return;
    const choose=(values:AidValues,group:string)=>Object.fromEntries(Object.entries(values).filter(([k])=>replace||!occupied(group,k)));
    onApply({...preview,applicant:choose(preview.applicant,"applicant"),survey:survey?choose(preview.survey,"survey"):{}});
    setPreview(null);setText("");setNotice("Isian diterapkan. Periksa dan lengkapi form sebelum menyimpan.");
  }
  return <details className={s.root}><summary>Isi otomatis dari pesan WhatsApp <span>Tempel pesan → periksa → terapkan</span></summary>
    <div className={s.body}><p>Tempel form yang sudah diisi. Proses dilakukan di perangkat ini. Data tidak langsung dikirim sebagai pengajuan.</p>
    <label>Pesan WhatsApp<textarea maxLength={40000} rows={6} value={text} onChange={e=>{setText(e.target.value);setPreview(null);setNotice("");}} placeholder="Tempel data pemohon atau hasil verifikasi di sini…"/></label>
    <button type="button" disabled={!text.trim()} onClick={()=>{setPreview(parseWhatsappMessage(text));setNotice("");}}>Periksa hasil impor</button>
    {preview&&<><div className={s.preview}><strong>{entries.length} kolom dikenali</strong>{entries.length===0?<p>Belum ada isian yang dikenali. Gunakan format Nama : isi dan kolom lainnya.</p>:<dl>{entries.map(({group,k,v})=><div key={group+k}><dt>{labels[k]??k}{occupied(group,k)&&<small>Sudah terisi</small>}</dt><dd>{typeof v==="boolean"?(v?"Ya":"Tidak"):String(v)}</dd></div>)}</dl>}</div>
      {preview.warnings.map(w=><p role="status" key={w}>{w}</p>)}
      {!survey&&Object.keys(preview.survey).length>0&&<p>Bagian hasil survei belum diterapkan di form pemohon. Gunakan impor hasil survei pada tahap kunjungan.</p>}
      <label className={s.check}><input type="checkbox" checked={replace} onChange={e=>setReplace(e.target.checked)}/>Ganti juga kolom yang sudah terisi dengan hasil impor</label>
      <button type="button" disabled={!entries.length} onClick={apply}>Terapkan ke form</button><p>Kolom kosong dalam pesan tidak akan menghapus data atau foto yang sudah ada.</p>
    </>}
    {notice&&<p role="status">{notice}</p>}</div></details>;
}
