"use client";
import {useRef,useState,type FormEvent} from "react";
import Link from "next/link";
import {Check,Wallet,ChevronDown} from "lucide-react";
import type {AidApplication,AidDashboard,AidPage,BantuanStaff} from "@/contracts/modules/bantuan";
import {money,request} from "../api/client";
import {preparePhotoUpload} from "../api/photos";
import { appendPhotoLocation } from "../photo-location";
import s from "./DisbursementGroups.module.css";

export function DisbursementGroups({tickets,staff,onSaved}:{tickets:AidDashboard["tickets"];staff:BantuanStaff[];onSaved:()=>void}){
 return <section className={s.root}><header><h2>Transfer ke penyalur</h2><p>Pilih penyalur, pilih bantuannya, lalu catat transfer yang sudah dilakukan.</p></header><div className={s.groups}>{tickets.map((ticket,i)=><TransferGroup key={`${ticket.distributor_id}:${ticket.distribution_type}:${i}`} ticket={ticket} staff={staff} onSaved={onSaved}/>)}</div></section>;
}
function TransferGroup({ticket,staff,onSaved}:{ticket:AidDashboard["tickets"][number];staff:BantuanStaff[];onSaved:()=>void}){
 const [rows,setRows]=useState<AidApplication[]>([]),[selected,setSelected]=useState<Record<string,boolean>>({});
 const [open,setOpen]=useState(false),[loading,setLoading]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(""),[saved,setSaved]=useState("");
 const [date,setDate]=useState(()=>new Date().toLocaleDateString("en-CA")),[account,setAccount]=useState(""),[file,setFile]=useState<File|null>(null),[confirmed,setConfirmed]=useState(false);
 const lock=useRef(false),formRef=useRef<HTMLFormElement>(null),uploaded=useRef(new Set<string>());
 const name=ticket.distribution_type==="direct"?"Penyerahan langsung oleh Bendahara":staff.find(p=>p.id===ticket.distributor_id)?.name??"Penyalur belum tersedia";
 const chosen=rows.filter(row=>selected[row.id]),total=chosen.reduce((sum,row)=>sum+(row.amount??0),0);
 async function load(){
  if(lock.current)return;setOpen(true);setLoading(true);setError("");
  try{const query=new URLSearchParams({status:"fund_approved",distributionType:"verifier",distributorId:ticket.distributor_id??"",perPage:"48"});
   const result=await request<AidPage>(`applications?${query}`,{},false);
   setRows(result.data);setSelected({});setConfirmed(false);
   requestAnimationFrame(()=>formRef.current?.scrollIntoView({behavior:"smooth",block:"start"}));
  }catch(e){setError(e instanceof Error?e.message:"Daftar belum dapat dimuat.");}finally{setLoading(false);}
 }
 async function save(event:FormEvent){event.preventDefault();if(lock.current||!chosen.length||!confirmed)return;lock.current=true;setBusy(true);setError("");
  try{
   if(file){const {file:photo,location}=await preparePhotoUpload(file);for(const row of chosen){if(uploaded.current.has(row.id))continue;const body=new FormData();body.set("kind","transfer");body.set("file",photo);appendPhotoLocation(body,location);await request(`applications/${row.id}/documents`,{method:"POST",body});uploaded.current.add(row.id);}}
   await request("batch",{method:"POST",body:JSON.stringify({action:"disburse",transferDate:date,account:account.trim(),totalAmount:total,items:chosen.map(row=>({id:row.id,version:row.version,transferAmount:row.amount}))})});
   setSaved(`${chosen.length} bantuan senilai ${money(total)} sudah dicatat. Status menjadi siap diserahkan dan penyalur mendapat notifikasi.`);setOpen(false);onSaved();
  }catch(e){setError(e instanceof Error?e.message:"Pencairan belum dapat dicatat. Periksa status sebelum mencoba lagi.");}finally{lock.current=false;setBusy(false);}
 }
 return <article className={`${s.group} ${open?s.expanded:""}`}><div className={s.heading}><div className={s.identity}><span className={s.avatar} aria-hidden="true">{name.split(" ").slice(0,2).map(part=>part[0]).join("")}</span><div><span className={s.caption}>Penyalur bantuan</span><h3>{name}</h3></div></div><span className={s.badge}>{ticket.total} bantuan</span></div><div className={s.amount}><span>Total siap dicairkan</span><strong className={s.total}>{money(Number(ticket.amount))}</strong></div>
 {saved&&<p role="status" className={s.success}>{saved}</p>}
 {ticket.distribution_type!=="verifier"||!ticket.distributor_id?<p>Catat pencairan langsung melalui detail masing-masing pengajuan di daftar bawah.</p>:<button type="button" className={`${s.primary} ${s.openButton}`} aria-expanded={open} disabled={loading||busy} onClick={()=>open?setOpen(false):void load()}><Wallet size={18}/>{loading?"Memuat bantuan…":"Pilih bantuan & catat transfer"}<ChevronDown size={16}/></button>}
 {open&&<form ref={formRef} className={s.form} onSubmit={save}><fieldset disabled={busy||loading}><div className={s.selection}><label><input type="checkbox" checked={rows.length>0&&chosen.length===rows.length} onChange={e=>{setSelected(Object.fromEntries(rows.map(row=>[row.id,e.target.checked])));setConfirmed(false);}}/>Pilih semua ({rows.length})</label><span>{chosen.length} dipilih</span></div>
 {Number(ticket.total)>48&&<p>Maksimal 48 bantuan ditampilkan per pencairan. Setelah disimpan, lanjutkan bantuan sisanya.</p>}
 <div className={s.recipients}>{rows.map(row=><label key={row.id}><input type="checkbox" checked={!!selected[row.id]} onChange={e=>{setSelected(v=>({...v,[row.id]:e.target.checked}));setConfirmed(false);}}/><span><strong>{row.name}</strong><small>{row.program} · <Link href={`/admin/bantuan/pengajuan/${row.id}?from=pencairan`} target="_blank">{row.number}</Link></small></span><b>{money(row.amount)}</b></label>)}</div>
 <div className={s.summary}><span>Total transfer ke <strong>{name}</strong></span><strong>{money(total)}</strong></div>
 <div className={s.fields}><label>Tanggal transfer<input type="date" required max={new Date().toLocaleDateString("en-CA")} value={date} onChange={e=>{setDate(e.target.value);setConfirmed(false);}}/></label><label>Bank & rekening tujuan<input required maxLength={191} value={account} onChange={e=>{setAccount(e.target.value);setConfirmed(false);}} placeholder="Nama bank · nomor rekening · atas nama"/></label></div>
 <label className={s.evidence}>Bukti transfer <small>Opsional · satu bukti untuk semua bantuan terpilih</small><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>{setFile(e.target.files?.[0]??null);uploaded.current.clear();}}/></label>
 <label className={s.confirm}><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>Saya memastikan {money(total)} sudah ditransfer ke {name} untuk {chosen.length} bantuan yang dipilih.</label>
 <div className={s.footer}><button type="button" className={s.secondary} onClick={()=>setOpen(false)}>Batal</button><button className={s.primary} disabled={!chosen.length||!confirmed||busy||loading}><Check size={18}/>{busy?"Mencatat transfer…":"Catat sudah ditransfer"}</button></div></fieldset></form>}
 {error&&<p role="alert" className={s.error}>{error} <button type="button" disabled={busy||loading} onClick={()=>void load()}>Muat ulang pilihan</button></p>}
 </article>;
}
