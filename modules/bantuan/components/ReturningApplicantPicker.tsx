"use client";
import { useEffect, useId, useState } from "react";
import { Search, UserRound, LoaderCircle } from "lucide-react";
import type { AidDetail } from "@/contracts/modules/bantuan";
import { day, request } from "../api/client";
import { Button } from "./ui";
import s from "./ReturningApplicantPicker.module.css";

interface Person {id:string;name:string;nikLabel:string;program:string;createdAt:string}
export function ReturningApplicantPicker({excludeId,onApply}:{excludeId?:string;onApply:(detail:AidDetail,mode:"auto"|"manual")=>void}){
  const id=useId(),[query,setQuery]=useState(""),[result,setResult]=useState<{query:string;people:Person[]}|null>(null);
  const [loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[open,setOpen]=useState(false),[index,setIndex]=useState(0);
  const [selected,setSelected]=useState<AidDetail|null>(null);
  useEffect(()=>{
    const term=query.trim();if(term.length<2||/^\d+$/.test(term)&&term.length!==16)return;
    const controller=new AbortController(),timer=setTimeout(()=>{
      void request<Person[]>("applicants/search",{method:"POST",signal:controller.signal,body:JSON.stringify({query:term,excludeId})})
        .then(people=>{if(!controller.signal.aborted)setResult({query,people});})
        .catch(err=>{if(!controller.signal.aborted)setError(err instanceof Error?err.message:"Pencarian belum berhasil.");})
        .finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    },350);
    return()=>{clearTimeout(timer);controller.abort();};
  },[query,excludeId]);
  const people=result?.query===query?result.people:[];
  async function choose(person:Person){
    setBusy(true);setError("");setOpen(false);
    try{setSelected(await request<AidDetail>("applications/"+person.id));}
    catch(err){setError(err instanceof Error?err.message:"Data pemohon belum dapat dibuka.");}
    finally{setBusy(false);}
  }
  const dropdown=open&&query.trim().length>=2;
  return <div className={s.picker} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node|null))setOpen(false);}}>
    <label htmlFor={id}>Cari pemohon sebelumnya</label>
    <div className={s.search}><Search size={17}/><input id={id} type="search" role="combobox" autoComplete="off" placeholder="Ketik nama atau NIK lengkap…" value={query} disabled={busy} aria-expanded={dropdown} aria-controls={id+"-results"} aria-autocomplete="list" aria-activedescendant={dropdown&&people[index]?id+"-"+index:undefined}
      onFocus={()=>setOpen(true)} onChange={e=>{const value=e.target.value;setQuery(value);setSelected(null);setIndex(0);setOpen(true);setError("");setLoading(value.trim().length>=2&&(!/^\d+$/.test(value.trim())||value.trim().length===16));}}
      onKeyDown={e=>{if(e.key==="Escape"){setOpen(false);return;}if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();setOpen(true);setIndex(value=>Math.max(0,Math.min(people.length-1,value+(e.key==="ArrowDown"?1:-1))));}if(e.key==="Enter"){e.preventDefault();if(open&&people[index])void choose(people[index]);}}}/>{(loading||busy)&&<LoaderCircle size={16} className={s.spin}/>}</div>
    <small>Cari minimal 2 huruf nama atau masukkan NIK lengkap 16 digit. Hasil sesuai akses akun Anda.</small>
    {dropdown&&<div className={s.dropdown} id={id+"-results"} role="listbox" aria-label="Hasil pencarian pemohon">
      {people.map((person,i)=><button type="button" role="option" id={id+"-"+i} aria-selected={index===i} key={person.id} onMouseEnter={()=>setIndex(i)} onClick={()=>void choose(person)}><UserRound size={19}/><span><strong>{person.name}</strong><small>{person.nikLabel} · {person.program} · {day(person.createdAt)}</small></span></button>)}
      {!people.length&&<p>{loading?"Mencari pemohon…":/^\d+$/.test(query.trim())&&query.trim().length!==16?"Lengkapi NIK menjadi 16 digit.":error||"Pemohon belum ditemukan. Coba nama lain atau NIK lengkap."}</p>}
    </div>}
    {error&&!dropdown&&<p role="alert" className={s.error}>{error}</p>}
    {selected&&<div className={s.selected}><div><UserRound size={19}/><span><strong>{String(selected.applicant.name)}</strong><small>Data dari {selected.number} · {day(selected.createdAt)}</small></span></div><p>Pilih cara mengisi. Keduanya membuat pengajuan baru; foto dan riwayat lama tidak ikut diubah.</p><div className={s.actions}><Button type="button" onClick={()=>onApply(selected,"auto")}>Isi otomatis dari data terakhir</Button><Button type="button" variant="secondary" onClick={()=>onApply(selected,"manual")}>Isi ulang, gunakan nama & NIK</Button></div><small>Setelah isi otomatis, periksa kembali data dan tulis kebutuhan bantuan saat ini.</small></div>}
  </div>;
}
