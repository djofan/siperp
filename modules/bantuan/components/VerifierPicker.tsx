"use client";
import { useId, useRef, useState } from "react";
import type { BantuanStaff } from "@/contracts/modules/bantuan";
import s from "./Workspace.module.css";

export function VerifierPicker({staff,name,initialId="",required=true,label="Verifikator",roleFilter="verifier"}:{staff:BantuanStaff[];name:string;initialId?:string;required?:boolean;label?:string;roleFilter?:string|null}){
  const id=useId(),input=useRef<HTMLInputElement>(null);
  const available=staff.filter(person=>person.active&&(!roleFilter||(person.roles??[person.role]).includes(roleFilter)));
  const initial=available.find(person=>person.id===initialId);
  const [query,setQuery]=useState<string|null>(null),[selected,setSelected]=useState(initialId),[open,setOpen]=useState(false),[cursor,setCursor]=useState(0);
  const displayedQuery=query??initial?.name??"";
  const terms=displayedQuery.trim().toLocaleLowerCase("id-ID").split(/\s+/).filter(Boolean);
  const matches=available.filter(person=>terms.every(term=>[person.name,person.code,person.region].filter(Boolean).join(" ").toLocaleLowerCase("id-ID").includes(term)));
  const options=matches.slice(0,50);
  function choose(person:BantuanStaff){setSelected(person.id);setQuery(person.name);setOpen(false);input.current?.setCustomValidity("");}
  return <div className={s.field} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node))setOpen(false);}}>
    <label htmlFor={id}>{label}{required?" *":" (opsional)"}</label>
    <input ref={input} id={id} className={s.input} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={id+"-list"} aria-activedescendant={open&&options[cursor]?id+"-"+cursor:undefined} required={required} placeholder="Cari nama, kode akun, atau wilayah…" value={displayedQuery} autoComplete="off" onFocus={()=>setOpen(true)} onChange={event=>{setQuery(event.target.value);setSelected("");setOpen(true);setCursor(0);event.target.setCustomValidity(event.target.value?"Pilih petugas dari hasil pencarian.":"");}} onKeyDown={event=>{if(event.key==="ArrowDown"){event.preventDefault();setOpen(true);setCursor(v=>Math.min(v+1,options.length-1));}if(event.key==="ArrowUp"){event.preventDefault();setCursor(v=>Math.max(0,v-1));}if(event.key==="Enter"&&open){event.preventDefault();if(options[cursor])choose(options[cursor]);}if(event.key==="Escape")setOpen(false);}}/>
    <input type="hidden" name={name} value={selected}/>
    {open&&<div id={id+"-list"} role="listbox" aria-label={`Hasil pencarian ${label}`} style={{maxHeight:240,overflowY:"auto",background:"white",borderRadius:12,padding:6,boxShadow:"0 6px 20px #173d2514"}}>
      {!options.length&&<p role="status">Tidak ada petugas yang cocok.</p>}
      {options.map((person,index)=><button key={person.id} id={id+"-"+index} role="option" aria-selected={person.id===selected} type="button" onMouseDown={event=>event.preventDefault()} onClick={()=>choose(person)} style={{display:"block",width:"100%",textAlign:"left",padding:"10px 12px",border:0,borderRadius:8,background:index===cursor?"#edf4e6":"white",color:"#173d25"}}><strong>{person.name}</strong><small style={{display:"block"}}>{[person.code,person.region].filter(Boolean).join(" · ")}</small></button>)}
      {matches.length>50&&<small>Ketik lebih spesifik untuk mempersempit {matches.length} petugas.</small>}
    </div>}
    <small>{selected?"Petugas sudah dipilih. Ketik lagi untuk mengganti.":required?"Ketik lalu klik nama petugas, atau gunakan panah dan Enter.":"Kosongkan jika petugas belum memiliki akun."}</small>
  </div>;
}
