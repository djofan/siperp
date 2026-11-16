"use client";
/* eslint-disable @next/next/no-img-element -- private authenticated photos bypass public optimization */
import type { PhotoLocation } from "@/contracts/modules/bantuan";
import { PhotoLocationLink } from "./PhotoLocationLink";
import { useState } from "react";
import { createPortal } from "react-dom";
import { RotateCcw, RotateCw } from "lucide-react";
import { Button, Dialog } from "./ui";
import s from "./PhotoViewer.module.css";
import { attachmentType, isPhoto } from "../attachments";
import { FileText } from "lucide-react";

export function PhotoViewer({src,title,onClose,location,mime="image/jpeg"}:{src:string;title:string;onClose:()=>void;location?:PhotoLocation|null;mime?:string}) {
  const [angle,setAngle]=useState(0);
  const [failed,setFailed]=useState(false);
  if(!isPhoto(mime))return createPortal(<Dialog title={title} onClose={onClose} wide>
    {mime==="application/pdf"?<iframe title={title} src={src} style={{width:"100%",height:"65vh",border:0,borderRadius:12}}/>:<div style={{display:"grid",justifyItems:"center",gap:14,padding:"28px 16px"}}><FileText size={44}/><strong>{attachmentType(mime)}</strong><p>Unduh berkas untuk membukanya di aplikasi dokumen Anda.</p></div>}
    <div className={s.toolbar}><a href={src} target="_blank" rel="noopener noreferrer" download={mime!=="application/pdf"} style={{fontWeight:600,color:"#245740"}}>{mime==="application/pdf"?"Buka PDF di tab baru / unduh":"Unduh dokumen"}</a></div>
  </Dialog>,document.body);
  return createPortal(<Dialog title={title} onClose={onClose} wide>
    <div className={s.toolbar} role="group" aria-label="Putar foto">
      <Button type="button" variant="secondary" onClick={()=>setAngle(value=>value-90)} disabled={failed}><RotateCcw size={17}/>Putar kiri</Button>
      <Button type="button" variant="secondary" onClick={()=>setAngle(value=>value+90)} disabled={failed}><RotateCw size={17}/>Putar kanan</Button>
      <Button type="button" variant="ghost" onClick={()=>setAngle(0)} disabled={angle===0||failed}>Reset</Button>
    </div>
    {failed?<p role="alert">Foto belum dapat dimuat. Tutup lalu coba buka kembali.</p>:<div className={s.stage}><img src={src} alt={title} style={{transform:`rotate(${angle}deg)`}} onError={()=>setFailed(true)}/></div>}
    <PhotoLocationLink location={location}/>
    <p className={s.hint}>Putar 90° untuk memudahkan membaca. File asli tetap tersimpan seperti semula.</p>
  </Dialog>,document.body);
}
