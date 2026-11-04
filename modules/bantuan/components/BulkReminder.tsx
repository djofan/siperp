"use client";
import { useState } from "react";
import { BellRing } from "lucide-react";
import type { AidApplication, BantuanViewer } from "@/contracts/modules/bantuan";
import { hasAnyRole } from "../permissions";
import { request } from "../api/client";
import { reminderTargets } from "./ApplicationReminder";
import s from "./ApplicationReminder.module.css";

type Result = {count:number;recipients:{id:string;name:string;count:number;message:string;url:string|null;copyRequired:boolean}[]};
export function BulkReminder({rows,viewer,refreshing}:{rows:AidApplication[];viewer:BantuanViewer;refreshing:boolean}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  const [result,setResult]=useState<Result|null>(null),[copied,setCopied]=useState("");
  const eligible=rows.filter(row=>reminderTargets[row.status]);
  if(!hasAnyRole(viewer,["admin","call_center"])||!eligible.length)return null;
  async function prepare(){
    setBusy(true);setError("");setResult(null);
    try{setResult(await request<Result>("application-reminders",{method:"POST",body:JSON.stringify({applications:eligible.map(row=>({id:row.id,status:row.status}))})}));}
    catch(e){setError(e instanceof Error?e.message:"Pengingat belum berhasil disiapkan.");}
    finally{setBusy(false);}
  }
  async function copy(id:string,message:string){
    try{await navigator.clipboard.writeText(message);setCopied(id);}
    catch{setError("Tidak dapat menyalin otomatis. Pilih dan salin teks pesan di bawah.");}
  }
  return <section className={`${s.root} ${s.bulk}`} aria-label="Pengingat sekaligus">
    <div className={s.bulkHeader}><div><strong>Ingatkan petugas sekaligus</strong><p>{eligible.length} pengajuan aktif pada halaman ini. Satu pesan per petugas sesuai tugasnya.</p></div><button className={s.trigger} type="button" disabled={busy||refreshing} onClick={prepare}><BellRing size={16}/>{busy?"Menyiapkan…":`Siapkan ${eligible.length} pengingat`}</button></div>
    <small>Notifikasi lonceng dibuat saat disiapkan. Pesan WhatsApp Anda periksa dan kirim sendiri. Gunakan filter untuk menentukan tahap yang ingin diingatkan.</small>
    {error&&<p role="alert" className={s.error}>{error}</p>}
    {result&&<div className={s.result}><p role="status">{result.count} pengajuan dikelompokkan untuk {result.recipients.length} petugas. Pengingat lonceng tahap yang sama tidak digandakan dalam sehari.</p>
      {result.recipients.map(p=><details key={p.id}><summary>{p.name} · {p.count} pengajuan — lihat pesan</summary><textarea aria-label={`Pesan untuk ${p.name}`} readOnly value={p.message} rows={9}/><div className={s.person}><button type="button" className={s.trigger} onClick={()=>copy(p.id,p.message)}>{copied===p.id?"Pesan tersalin":"Salin pesan"}</button>{p.url?<a href={p.url} target="_blank" rel="noopener noreferrer">Buka WhatsApp ↗</a>:<span>Nomor WA belum diisi. Notifikasi lonceng tetap tersedia.</span>}</div>{p.copyRequired&&<p>Pesan panjang: salin pesan, buka WhatsApp, lalu tempel dan kirim.</p>}</details>)}
      <button className={s.close} type="button" onClick={()=>setResult(null)}>Tutup pengingat</button></div>}
  </section>;
}
