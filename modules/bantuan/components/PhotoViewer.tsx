"use client";
/* eslint-disable @next/next/no-img-element -- private authenticated photos bypass public optimization */
import type { PhotoLocation } from "@/contracts/modules/bantuan";
import { PhotoLocationLink } from "./PhotoLocationLink";
import { useState } from "react";
import { RotateCcw, RotateCw } from "lucide-react";
import { Button, Dialog } from "./ui";
import s from "./PhotoViewer.module.css";

export function PhotoViewer({src,title,onClose,location}:{src:string;title:string;onClose:()=>void;location?:PhotoLocation|null}) {
  const [angle,setAngle]=useState(0);
  const [failed,setFailed]=useState(false);
  return <Dialog title={title} onClose={onClose} wide>
    <div className={s.toolbar} role="group" aria-label="Putar foto">
      <Button variant="secondary" onClick={()=>setAngle(value=>value-90)} disabled={failed}><RotateCcw size={17}/>Putar kiri</Button>
      <Button variant="secondary" onClick={()=>setAngle(value=>value+90)} disabled={failed}><RotateCw size={17}/>Putar kanan</Button>
      <Button variant="ghost" onClick={()=>setAngle(0)} disabled={angle===0||failed}>Reset</Button>
    </div>
    {failed?<p role="alert">Foto belum dapat dimuat. Tutup lalu coba buka kembali.</p>:<div className={s.stage}><img src={src} alt={title} style={{transform:`rotate(${angle}deg)`}} onError={()=>setFailed(true)}/></div>}
    <PhotoLocationLink location={location}/>
    <p className={s.hint}>Putar 90° untuk memudahkan membaca. File asli tetap tersimpan seperti semula.</p>
  </Dialog>;
}
