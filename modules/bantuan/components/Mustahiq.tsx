"use client";
import Link from "./WorkspaceNavigation";
import { ArrowUpRight, MapPin, Phone, BadgeCheck, Clock3, IdCard } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AidValues } from "@/contracts/modules/bantuan";
import { bantuanStatuses } from "@/contracts/modules/bantuan";
import { day, money, request, RequestError } from "../api/client";
import { applicantFields, Fields } from "./IntakeForm";
import { DependentsSummary } from "./Dependents";
import s from "./Mustahiq.module.css";
import w from "./Workspace.module.css";

type Person={id:string;name:string;nik:string;city:string;phone:string;records:number;submissions:number;received:number;lastSubmission:string};
type Page={data:Person[];total:number;current_page:number;last_page:number};
type Profile={id:string;applicant:AidValues;version:number;sourceId:string;sourceVersion:number;canEdit:boolean;updatedAt:string;summary:{records:number;submissions:number;drafts:number;received:number;receivedAmount:number};history:{id:string;number:string;program:string;status:string;source:string;amount:number|null;receivedAmount:number|null;createdAt:string;completedAt:string|null;canOpen:boolean}[]};

export function Mustahiq({id}:{id?:string}){
  const [search,setSearch]=useState(""),[received,setReceived]=useState(""),[page,setPage]=useState(1),[revision,setRevision]=useState(0);
  const [list,setList]=useState<Page|null>(null),[profile,setProfile]=useState<Profile|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
  const [editing,setEditing]=useState(false),[values,setValues]=useState<AidValues>({}),[busy,setBusy]=useState(false),[success,setSuccess]=useState(""),[errors,setErrors]=useState<Record<string,string[]>>({});
  const lock=useRef(false),feedback=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const controller=new AbortController();let live=true;
    const timer=setTimeout(()=>{
      setLoading(true);setError("");
      const params=new URLSearchParams({search,received,page:String(page)});
      void (id?request<Profile>(`mustahiq/${encodeURIComponent(id)}`,{signal:controller.signal}):request<Page>(`mustahiq?${params}`,{signal:controller.signal},false))
        .then(data=>{if(!live)return;if(id){const p=data as Profile;setProfile(p);setValues(p.applicant);}else setList(data as Page);})
        .catch(e=>{if(live)setError(e instanceof Error?e.message:"Data belum dapat dimuat.");})
        .finally(()=>{if(live)setLoading(false);});
    },id?0:250);
    return()=>{live=false;clearTimeout(timer);controller.abort();};
  },[id,search,received,page,revision]);
  async function save(e:FormEvent){
    e.preventDefault();if(!profile||lock.current)return;lock.current=true;setBusy(true);setError("");setErrors({});
    try{
      const updated=await request<Profile>(`mustahiq/${profile.id}`,{method:"PUT",body:JSON.stringify({applicant:values,version:profile.version,sourceId:profile.sourceId,sourceVersion:profile.sourceVersion})});
      setProfile(updated);setValues(updated.applicant);setEditing(false);setSuccess("Profil berhasil diperbarui. Riwayat pengajuan lama tetap tersimpan.");
    }catch(e){setError(e instanceof Error?e.message:"Profil belum berhasil disimpan.");if(e instanceof RequestError)setErrors(e.fields);}
    finally{lock.current=false;setBusy(false);requestAnimationFrame(()=>feedback.current?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:"center"}));}
  }
  return <section className={s.page}>
    <header className={s.heading}><div>{id&&<Link href="/admin/bantuan/mustahiq" className={s.back}>← Semua mustahiq</Link>}<span className={s.eyebrow}>DATA PENERIMA BANTUAN</span><h1>{id?String(profile?.applicant.name||"Profil mustahiq"):"Data Mustahiq"}</h1><p>{id?"Profil terkini dan riwayat bantuan dalam satu tempat.":"Cari nama atau NIK lengkap untuk melihat pengajuan dan bantuan yang diterima."}</p></div>{profile?.canEdit&&!editing&&!loading&&<button className={w.button} onClick={()=>{setEditing(true);setSuccess("");setError("");}}>Edit profil</button>}</header>
    <div ref={feedback} aria-live="polite">{error&&<div className={`${w.notice} ${w.error}`} role="alert">{error}{!editing&&<button onClick={()=>setRevision(v=>v+1)}>Muat ulang</button>}</div>}{success&&<div className={w.notice}>{success}</div>}</div>
    {!id&&<div className={s.filters}><label>Cari mustahiq<input value={search} placeholder="Nama atau NIK 16 digit…" onChange={e=>{setSearch(e.target.value);setPage(1);setLoading(true);}}/></label><label>Riwayat penerimaan<select value={received} onChange={e=>{setReceived(e.target.value);setPage(1);setLoading(true);}}><option value="">Semua mustahiq</option><option value="yes">Sudah menerima bantuan</option><option value="no">Belum menerima bantuan</option></select></label><button className={`${w.button} ${w.secondary}`} onClick={()=>{setSearch("");setReceived("");setPage(1);}}>Reset filter</button></div>}
    {loading?<div className={s.empty} role="status">Memuat data mustahiq…</div>:error&&!profile&&!list?null:id&&profile?<>
      <div className={s.stats}><div><span>Pengajuan dikirim</span><strong>{profile.summary.submissions} kali</strong><small>{profile.summary.drafts} draft terpisah</small></div><div><span>Bantuan diterima</span><strong>{profile.summary.received} kali</strong><small>Penyerahan sudah selesai</small></div><div><span>Total diterima</span><strong>{money(profile.summary.receivedAmount)}</strong><small>Nominal penyerahan aktual</small></div></div>
      <section className={s.panel}><h2>{editing?"Perbarui data mustahiq":"Data lengkap mustahiq"}</h2><p className={s.hint}>Diperbarui {day(profile.updatedAt)} · {profile.canEdit?"Dapat diedit oleh Call Center":"Akses baca saja"}</p>
      {editing?<form onSubmit={save}><p className={s.hint}>NIK: {String(profile.applicant.nik??"—")}. Koreksi profil tidak mengubah keputusan dan isian pengajuan lama.</p><fieldset disabled={busy} className={s.fieldset}><Fields fields={applicantFields.filter(f=>f.key!=="nik")} values={values} set={(key,value)=>setValues(v=>({...v,[key]:value}))} required={false} errors={errors} prefix="applicant."/></fieldset><div className={s.actions}><button type="button" className={`${w.button} ${w.secondary}`} disabled={busy} onClick={()=>{setEditing(false);setValues(profile.applicant);setError("");setErrors({});}}>Batal mengedit</button><button className={w.button} disabled={busy}>{busy?"Menyimpan…":"Simpan profil"}</button></div></form>:<dl className={s.info}>{applicantFields.filter(f=>f.key!=="willingSktm"||profile.applicant.hasSktm===false).map(f=><div key={f.key} className={f.wide||f.key==="dependents"?s.wide:undefined}><dt>{f.label}</dt><dd>{f.key==="dependents"?<DependentsSummary value={profile.applicant[f.key]}/>:typeof profile.applicant[f.key]==="boolean"?profile.applicant[f.key]?"Ya":"Tidak":["income","rent"].includes(f.key)&&profile.applicant[f.key]!==undefined?money(Number(profile.applicant[f.key])):String(profile.applicant[f.key]??"—").replaceAll("_"," ")||"—"}</dd></div>)}</dl>}
      </section>
      <section className={s.panel}><h2>Riwayat pengajuan & bantuan</h2><p className={s.hint}>{profile.summary.records} catatan termasuk draft, pembatalan, dan penolakan. Hanya status Selesai dihitung sebagai bantuan diterima.</p><div className={s.history}>{profile.history.map(item=><article key={item.id}><div><span className={s.tag}>{bantuanStatuses[item.status]??item.status}</span><h3>{item.program}</h3><small>{item.number} · {day(item.createdAt)}</small></div><div><strong>{item.receivedAmount!==null?money(item.receivedAmount):item.amount!==null?money(item.amount):"Nominal belum ditetapkan"}</strong><small>{item.receivedAmount!==null?`Diterima ${item.completedAt?day(item.completedAt):""}`:"Belum tercatat diterima"}</small>{item.canOpen&&<Link href={`/admin/bantuan/pengajuan/${item.id}`}>Lihat pengajuan →</Link>}</div></article>)}</div></section>
    </>:list?<><p className={s.hint}>{list.total} mustahiq sesuai filter · Satu profil per NIK</p><div className={s.grid}>{list.data.map(person=><Link className={s.card} href={`/admin/bantuan/mustahiq/${person.id}`} key={person.id}><div className={s.identity}><span className={s.initials} aria-hidden="true">{person.name.trim().split(/\s+/).slice(0,2).map(part=>part[0]).join("").toUpperCase()}</span><div><h2>{person.name}</h2><span className={s.personStatus} data-received={person.received>0}>{person.received?<BadgeCheck size={13}/>:<Clock3 size={13}/>} {person.received?"Sudah menerima bantuan":"Belum menerima bantuan"}</span></div><ArrowUpRight className={s.openIcon} size={19} aria-hidden="true"/></div>
      <dl className={s.contactDetails}><div><dt><IdCard size={15}/>NIK</dt><dd>{person.nik||"Belum dilengkapi"}</dd></div><div><dt><MapPin size={15}/>Wilayah</dt><dd>{person.city||"Belum diisi"}</dd></div><div><dt><Phone size={15}/>Telepon</dt><dd>{person.phone||"Belum diisi"}</dd></div></dl>
      <div className={s.counts}><div><strong>{person.submissions}</strong><span>Pengajuan<small>dikirim</small></span></div><div><strong>{person.received}</strong><span>Bantuan<small>diterima</small></span></div></div>
      <div className={s.cardBottom}><div><span>Pengajuan terakhir</span><time>{person.lastSubmission?day(person.lastSubmission):"Belum ada"}</time></div><strong className={s.profileAction}>Profil & riwayat <ArrowUpRight size={15}/></strong></div></Link>)}</div>{!list.data.length&&<div className={s.empty}>Tidak ada mustahiq sesuai filter.</div>}<div className={s.pagination}><span>Halaman {list.current_page} dari {list.last_page}</span><div><button className={`${w.button} ${w.secondary}`} disabled={page<=1} onClick={()=>{setPage(p=>p-1);setLoading(true);}}>Sebelumnya</button><button className={`${w.button} ${w.secondary}`} disabled={page>=list.last_page} onClick={()=>{setPage(p=>p+1);setLoading(true);}}>Berikutnya</button></div></div></>:null}
  </section>;
}
