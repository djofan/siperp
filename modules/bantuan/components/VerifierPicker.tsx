"use client";

import { useId, useState } from "react";
import type { BantuanStaff } from "@/contracts/modules/bantuan";
import s from "./Workspace.module.css";

export function VerifierPicker({staff,name,initialId="",required=true,label="Verifikator",roleFilter="verifier"}:{staff:BantuanStaff[];name:string;initialId?:string;required?:boolean;label?:string;roleFilter?:string|null}){
  const id=useId();
  const [query,setQuery]=useState("");
  const [selected,setSelected]=useState(initialId);
  const available=staff.filter(person=>person.active&&(!roleFilter||(person.roles??[person.role]).includes(roleFilter)));
  const terms=query.trim().toLocaleLowerCase("id-ID").split(/\s+/).filter(Boolean);
  const matches=available.filter(person=>terms.every(term=>[person.name,person.code,person.region].filter(Boolean).join(" ").toLocaleLowerCase("id-ID").includes(term)));
  const selectedPerson=available.find(person=>person.id===selected);
  const options=selectedPerson&&!matches.some(person=>person.id===selected)?[selectedPerson,...matches]:matches;
  return <div className={s.field}>
    <label htmlFor={id+"-search"}>Cari {label.toLowerCase()}</label>
    <input id={id+"-search"} className={s.input} type="search" placeholder="Ketik nama, kode akun, atau wilayah…" value={query} onChange={event=>setQuery(event.target.value)} autoComplete="off" aria-describedby={id+"-results"}/>
    <small id={id+"-results"} role="status">{matches.length?`${matches.length} dari ${available.length} petugas ditemukan. Pilih petugas di bawah.`:"Tidak ada petugas yang cocok. Coba nama, kode, atau wilayah lain."}</small>
    <label htmlFor={id+"-selection"}>{label}{required?" *":" (opsional)"}</label>
    <select id={id+"-selection"} className={s.input} name={name} required={required} value={selected} onChange={event=>setSelected(event.target.value)}>
      <option value="">{required?"Pilih "+label.toLowerCase():"Belum memiliki akun / isi nama manual"}</option>
      {options.map(person=><option key={person.id} value={person.id}>{person.name}{person.code?` · ${person.code}`:""}{person.region?` · ${person.region}`:""}{person.id===selected&&!matches.some(match=>match.id===selected)?" (pilihan saat ini)":""}</option>)}
    </select>
    {selectedPerson&&<small>Dipilih: <strong>{selectedPerson.name}</strong>{selectedPerson.code?` · ${selectedPerson.code}`:""}. Mengubah pencarian tidak membatalkan pilihan.</small>}
  </div>;
}
