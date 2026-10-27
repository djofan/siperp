"use client";
import type { AidDependent } from "@/contracts/modules/bantuan";
import { Plus, Trash2 } from "lucide-react";
import { dependentStatuses, readDependents } from "../dependents";
import s from "./Workspace.module.css";
import d from "./Dependents.module.css";

export function DependentsEditor({value,onChange,errors={}}:{value:unknown;onChange:(rows:AidDependent[])=>void;errors?:Record<string,string[]>}){
  const rows=readDependents(value);
  const update=(i:number,key:keyof AidDependent,next:string|number)=>onChange(rows.map((row,index)=>index===i?{...row,[key]:next}:row));
  const error=(i:number,key:string)=>errors[`applicant.dependents.${i}.${key}`]?.[0]??errors[`dependents.${i}.${key}`]?.[0];
  return <div className={d.list}>
    {typeof value==="string"&&value.trim()&&<small className={d.hint}>Lengkapi rincian tanggungan dari catatan sebelumnya.</small>}
    {rows.map((row,i)=><div className={d.person} role="group" aria-label={`Tanggungan ${i+1}`} key={i}>
      <div className={d.personHeader}><span>Tanggungan {String(i+1).padStart(2,"0")}</span><button type="button" className={d.remove} aria-label={`Hapus tanggungan ${i+1}`} onClick={()=>onChange(rows.filter((_,index)=>index!==i))}><Trash2 size={14} aria-hidden="true"/><span>Hapus</span></button></div>
      <div className={d.fields}>
      <label className={s.field}>Nama<input className={s.input} aria-label={`Nama tanggungan ${i+1}`} value={row.name} maxLength={191} onChange={e=>update(i,"name",e.target.value)} aria-invalid={!!error(i,"name")}/>{error(i,"name")&&<small className={s.fieldError}>{error(i,"name")}</small>}</label>
      <label className={s.field}>Hubungan<input className={s.input} aria-label={`Hubungan tanggungan ${i+1}`} placeholder="Mis. anak, istri, orang tua" value={row.relationship} maxLength={100} onChange={e=>update(i,"relationship",e.target.value)} aria-invalid={!!error(i,"relationship")}/>{error(i,"relationship")&&<small className={s.fieldError}>{error(i,"relationship")}</small>}</label>
      <label className={s.field}>Jenis kelamin<select className={s.input} aria-label={`Jenis kelamin tanggungan ${i+1}`} value={row.gender} onChange={e=>update(i,"gender",e.target.value)} aria-invalid={!!error(i,"gender")}><option value="">Pilih jenis kelamin</option><option value="laki_laki">Laki-laki</option><option value="perempuan">Perempuan</option></select>{error(i,"gender")&&<small className={s.fieldError}>{error(i,"gender")}</small>}</label>
      <label className={s.field}>Umur (tahun)<input className={s.input} aria-label={`Umur tanggungan ${i+1}`} type="number" inputMode="numeric" min={0} max={120} value={row.age} onChange={e=>update(i,"age",e.target.value===""?"":Number(e.target.value))} aria-invalid={!!error(i,"age")}/>{error(i,"age")&&<small className={s.fieldError}>{error(i,"age")}</small>}</label>
      <label className={s.field}>Status<select className={s.input} aria-label={`Status tanggungan ${i+1}`} value={row.status} onChange={e=>update(i,"status",e.target.value)} aria-invalid={!!error(i,"status")}><option value="">Pilih status</option>{dependentStatuses.map(status=><option key={status}>{status}</option>)}</select>{error(i,"status")&&<small className={s.fieldError}>{error(i,"status")}</small>}</label>
      </div>
    </div>)}
    <div className={d.footer}><button type="button" className={d.add} disabled={rows.length>=100} onClick={()=>onChange([...rows,{name:"",relationship:"",gender:"",age:"",status:""}])}><Plus size={15} aria-hidden="true"/>Tambah tanggungan</button><small>{rows.length} orang</small></div>
  </div>;
}
export function DependentsSummary({value}:{value:unknown}){
  if(typeof value==="string")return <span>{value||"Belum ada rincian"}</span>;
  const rows=readDependents(value);
  return rows.length?<div className={s.dependentSummary}>{rows.map((row,i)=><div key={i}><strong>{row.name||"—"}</strong><span>{row.relationship||"—"} · {row.gender==="laki_laki"?"Laki-laki":row.gender==="perempuan"?"Perempuan":"Jenis kelamin belum diisi"} · {row.age===""?"Umur belum diisi":row.age+" tahun"} · {row.status||"Status belum diisi"}</span></div>)}</div>:<span>Belum ada tanggungan</span>;
}
