"use client";

import { useState } from "react";
import { maximumPageSize, pageSizeOptions, parsePageSize } from "../list-filters";
import s from "./ApplicationList.module.css";

export function PageSizeControl({value,disabled,onChange}:{value:string;disabled:boolean;onChange:(value:string)=>void}) {
  const [custom,setCustom]=useState(!pageSizeOptions.includes(Number(value)));
  const [amount,setAmount]=useState(value);
  const [error,setError]=useState("");
  function apply() {
    const size=parsePageSize(amount);
    if(size===null){setError(`Isi bilangan bulat antara 1 dan ${maximumPageSize}.`);return;}
    setError("");onChange(String(size));
  }
  return <div className={s.pageSizeControl}>
    <label>Per halaman<select aria-label="Jumlah pengajuan per halaman" value={custom?"custom":value} disabled={disabled} onChange={event=>{setError("");if(event.target.value==="custom"){setAmount(value);setCustom(true);}else{setCustom(false);onChange(event.target.value);}}}>
      {pageSizeOptions.map(size=><option key={size} value={size}>{size}</option>)}<option value="custom">Jumlah khusus…</option>
    </select></label>
    {custom&&<><label>Jumlah khusus<input type="number" inputMode="numeric" min={1} max={maximumPageSize} step={1} aria-label="Jumlah pengajuan khusus per halaman" aria-invalid={!!error} aria-describedby={error?"bantuan-page-size-error":undefined} value={amount} disabled={disabled} onChange={event=>{setAmount(event.target.value);setError("");}} onKeyDown={event=>{if(event.key==="Enter"){event.preventDefault();apply();}}}/></label><button type="button" disabled={disabled} onClick={apply}>Terapkan jumlah</button><small>1–{maximumPageSize} baris</small></>}
    {error&&<span id="bantuan-page-size-error" className={s.pageSizeError} role="alert">{error}</span>}
  </div>;
}
