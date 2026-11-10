"use client";
import s from "./PhotoLocation.module.css";
import { useState } from "react";
import type { PhotoLocation } from "@/contracts/modules/bantuan";

export function PhotoLocationPicker({value,onChange,disabled=false}:{value:PhotoLocation|null;onChange:(value:PhotoLocation|null)=>void;disabled?:boolean}) {
  const [busy,setBusy]=useState(false),[error,setError]=useState("");
  function locate(){
    setError("");
    if(!navigator.geolocation){setError("Browser tidak mendukung lokasi. Foto tetap dapat diunggah.");return;}
    setBusy(true);
    navigator.geolocation.getCurrentPosition(position=>{
      onChange({latitude:position.coords.latitude,longitude:position.coords.longitude,source:"device",accuracy:position.coords.accuracy});setBusy(false);
    },()=>{setError("Lokasi tidak tersedia atau tidak diizinkan. Foto tetap dapat diunggah.");setBusy(false);},{enableHighAccuracy:true,timeout:10000,maximumAge:0});
  }
  return <div className={s.picker}><p>GPS dari metadata foto disertakan jika tersedia. Jika tidak ada, Anda dapat memilih lokasi perangkat saat ini; lokasi ini dicatat sebagai lokasi unggah, bukan lokasi pengambilan foto.</p><button type="button" disabled={disabled||busy} onClick={locate}>{busy?"Mencari lokasi…":value?"Perbarui lokasi perangkat":"Gunakan lokasi perangkat saat ini"}</button>{value&&<><small> Lokasi unggah dipilih · akurasi ±{Math.ceil(value.accuracy??0)} m</small><button type="button" disabled={disabled||busy} onClick={()=>onChange(null)}>Hapus lokasi perangkat</button></>}{error&&<p role="status">{error}</p>}</div>;
}
