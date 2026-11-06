"use client";

import { useEffect, useRef, useState } from "react";
import type { SantunanRecord } from "@/contracts/modules/bantuan";
import { renderSantunanCard, routineCardTemplates } from "../api/santunan-card";
import { cardPdf } from "../api/card-pdf";
import { Button, Dialog } from "./ui";
import s from "./Workspace.module.css";
import d from "./Santunan.module.css";

export function SantunanCard({row,verifier,onClose}:{row:SantunanRecord;verifier:string;onClose:()=>void}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [date,setDate] = useState(row.report?.distributionDate ?? new Date().toLocaleDateString("en-CA"));
  const [ready,setReady] = useState(false),[error,setError] = useState(""),[busy,setBusy] = useState(false);
  useEffect(()=>{
    let live = true;
    const target = canvas.current;
    if (!target || !date || !verifier) return;
    // Render offscreen so an older image load cannot overwrite a newer date.
    const buffer = document.createElement("canvas");
    renderSantunanCard(buffer,{category:row.category,frequency:row.frequency,amount:row.amount,verifier,recipient:row.recipientName,date}).then(()=>{
      if (!live) return;
      target.width=buffer.width;target.height=buffer.height;
      target.getContext("2d")?.drawImage(buffer,0,0);setReady(true);
    }).catch(()=>{if(live){setError("Kartu belum dapat dibuat. Tutup lalu coba lagi.");setReady(false);}});
    return ()=>{live=false;};
  },[row.frequency,row.category,row.amount,row.recipientName,verifier,date]);
  async function download(format:"jpg"|"pdf") {
    if (!canvas.current || !ready || !verifier) return;
    setBusy(true);setError("");
    try {
      const jpeg = await new Promise<Blob>((resolve,reject)=>canvas.current!.toBlob(blob=>blob?resolve(blob):reject(new Error()),"image/jpeg",0.98));
      const file = format==="pdf"?cardPdf(new Uint8Array(await jpeg.arrayBuffer()),canvas.current.width,canvas.current.height):jpeg;
      const url=URL.createObjectURL(file),link=document.createElement("a");
      link.href=url;link.download=`kartu-${row.number.replace(/[^a-zA-Z0-9-]/g,"-")}-${date}.${format}`;
      link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
    } catch {setError("Unduhan gagal. Coba kembali.");} finally {setBusy(false);}
  }
  return <Dialog title={`Kertas bantuan - ${row.frequency==="non_routine"?"Anak yatim tidak rutin":routineCardTemplates[row.category].label}`} description="Nominal, verifikator, dan penerima mengikuti data santunan. Pilih tanggal yang akan dicetak; pilihan ini tidak mengubah laporan penyaluran." onClose={onClose} wide>
    <label className={s.field}>Tanggal pada kartu<input className={s.input} type="date" required value={date} onChange={e=>{setReady(false);setError("");setDate(e.target.value);}}/></label>
    {!verifier&&<p className={s.fieldError} role="alert">Nama penyalur tidak ditemukan. Periksa akun pada Tim & akses, lalu muat ulang daftar santunan.</p>}
    {error&&<p className={s.fieldError} role="alert">{error}</p>}
    {!ready&&date&&verifier&&!error&&<p role="status">Menyiapkan kartu…</p>}
    <canvas ref={canvas} role="img" aria-label={`Kartu bantuan ${row.recipientName}, verifikator ${verifier}, tanggal ${date}`} style={{display:ready?"block":"none",width:"100%",height:"auto",marginTop:16,border:"1px solid #dce5d6",borderRadius:8}}/>
    <div className={d.formActions}><Button variant="secondary" disabled={!ready||!date||!verifier||busy} onClick={()=>void download("jpg")}>Unduh JPG</Button><Button disabled={!ready||!date||!verifier||busy} onClick={()=>void download("pdf")}>Unduh PDF</Button></div>
  </Dialog>;
}
