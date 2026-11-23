"use client";

import { useEffect, useId, useRef, useState } from "react";
import { isStatus, statuses } from "../api/policy";
import styles from "./TrackingPopup.module.css";

type PublicTicket = {
  number:string;status:string;updatedAt:string;dueAt:string|null;
  outlet:{name:string;phone:string};events:{status:string;createdAt:string}[];
};
const formatDate=(value:string)=>new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Jakarta"}).format(new Date(value));
const label=(status:string)=>isStatus(status)?statuses[status]:"Perkembangan servis";

export function TrackingPopup({children="Cek status servis",className,autoFromLink=false}:{children?:React.ReactNode;className?:string;autoFromLink?:boolean}) {
  const dialog=useRef<HTMLDialogElement>(null),request=useRef<AbortController|null>(null),previousOverflow=useRef("");
  const id=useId();
  const [pending,setPending]=useState(false),[error,setError]=useState(""),[ticket,setTicket]=useState<PublicTicket|null>(null);
  const resultTitle=useRef<HTMLHeadingElement>(null),codeInput=useRef<HTMLInputElement>(null);
  const form=useRef<HTMLFormElement>(null);
  useEffect(()=>{
    if(!autoFromLink)return;
    const popup=dialog.current;
    function openFromLink(){
      const match=window.location.hash.match(/^#cek-status(?:\?kode=([a-f0-9]{48}))?$/i);
      if(!match)return;
      previousOverflow.current=document.body.style.overflow;
      dialog.current?.showModal();document.body.style.overflow="hidden";
      if(match[1]){
        const input=codeInput.current;
        if(input)input.value=match[1];
        form.current?.requestSubmit();
      }
      window.history.replaceState(null,"",window.location.pathname+window.location.search);
    }
    const timer=window.setTimeout(openFromLink,0);window.addEventListener("hashchange",openFromLink);
    return()=>{window.clearTimeout(timer);window.removeEventListener("hashchange",openFromLink);request.current?.abort();if(popup?.open)document.body.style.overflow=previousOverflow.current;};
  },[autoFromLink]);
  useEffect(()=>{if(ticket)resultTitle.current?.focus();},[ticket]);
  function close(){request.current?.abort();dialog.current?.close();}
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();
    setError("");setTicket(null);
    const value=String(new FormData(event.currentTarget).get("kode")??"").trim();
    let token=value.toLowerCase();
    if(!/^[a-f0-9]{48}$/.test(token)){
      try{const url=new URL(value);token=(url.searchParams.get("kode")??new URLSearchParams(url.hash.split("?")[1]).get("kode")??"").toLowerCase();}catch{token="";}
    }
    if(!/^[a-f0-9]{48}$/.test(token)){setError("Tempel kode atau tautan pelacakan yang diberikan outlet.");return;}
    request.current?.abort();
    const controller=new AbortController();request.current=controller;setPending(true);
    try{
      const response=await fetch(`/api/teknisi/tracking/${token}`,{headers:{Accept:"application/json"},cache:"no-store",credentials:"omit",referrerPolicy:"no-referrer",signal:controller.signal});
      if(!response.ok){
        if(response.status===404)throw new Error("Kode belum ditemukan. Periksa kembali kode atau hubungi outlet tempat servis.");
        if(response.status===429)throw new Error("Terlalu banyak percobaan. Tunggu sebentar sebelum mencoba kembali.");
        throw new Error("Layanan pelacakan belum tersedia. Silakan coba lagi beberapa saat.");
      }
      const body=await response.json();
      if(!body.data?.number||!Array.isArray(body.data.events))throw new Error("Data pelacakan belum tersedia. Silakan hubungi outlet.");
      setTicket(body.data);
    }catch(cause){if(!controller.signal.aborted)setError(cause instanceof Error?cause.message:"Tidak dapat menghubungi layanan pelacakan.");}
    finally{if(request.current===controller)setPending(false);}
  }
  const events=ticket?.events.filter((event,index,all)=>index===0||event.status!==all[index-1].status)??[];
  return <>
    <button type="button" className={className} aria-haspopup="dialog" onClick={()=>{
      previousOverflow.current=document.body.style.overflow;
      dialog.current?.showModal();document.body.style.overflow="hidden";
    }}>{children}</button>
    <dialog ref={dialog} className={styles.dialog} aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} onCancel={()=>request.current?.abort()} onClose={()=>{document.body.style.overflow=previousOverflow.current;setPending(false);}} onClick={event=>{if(event.target===dialog.current){const bounds=dialog.current.getBoundingClientRect();if(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom)close();}}}>
      <header className={styles.heading}><span className={styles.symbol} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 5h4m-3 14h2"/></svg></span><div><p className={styles.eyebrow}>PELANGGAN · TEKNISI HP</p><h2 id={`${id}-title`} ref={resultTitle} tabIndex={-1}>{ticket?"Perkembangan servis":"Cek status servis"}</h2></div><button type="button" className={styles.close} aria-label="Tutup pelacakan" onClick={close}>×</button></header>
      <div className={styles.body}>
      <p className={styles.description} id={`${id}-description`}>{ticket?"Informasi terbaru dari outlet tempat Anda menitipkan perangkat.":"Masukkan kode dari outlet untuk melihat status dan riwayat pengerjaan. Tidak perlu login."}</p>
      <form ref={form} onSubmit={submit} className={styles.form} hidden={!!ticket}>
        <label htmlFor={`${id}-code`}>Kode pelacakan<span aria-hidden="true" className="ml-1 text-red-600 dark:text-red-400">*</span></label>
        <input ref={codeInput} name="kode" id={`${id}-code`} disabled={pending} required maxLength={2048} autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="Tempel kode atau tautan dari outlet" aria-invalid={!!error} aria-describedby={error?`${id}-error`:undefined}/>
        <button disabled={pending} type="submit">{pending?"Mengecek progres…":"Lihat status servis"}<span aria-hidden="true">→</span></button>
      </form>
      {error&&<p className={styles.error} id={`${id}-error`} role="alert">{error}</p>}
      <div aria-live="polite" aria-busy={pending}>
        {ticket&&<section className={styles.result} aria-label="Hasil pelacakan"><div className={styles.summary}><div className={styles.resultHeading}><small>STATUS TERKINI</small><span>{label(ticket.status)}</span></div><strong className={styles.ticketNumber}>{ticket.number}</strong><p>{ticket.status==="collected"?"Perangkat sudah diambil. Terima kasih telah menggunakan layanan kami.":ticket.status==="ready"?"Perangkat siap diambil. Hubungi outlet untuk mengatur pengambilan.":ticket.status==="cancelled"?"Servis dibatalkan. Hubungi outlet untuk informasi lebih lanjut.":"Pengerjaan tercatat di outlet. Pantau perubahan status melalui kode ini."}</p></div><dl className={styles.details}><div><dt>Outlet layanan</dt><dd>{ticket.outlet.name}</dd></div><div><dt>Kontak outlet</dt><dd>{ticket.outlet.phone||"Belum tersedia"}</dd></div><div><dt>Pembaruan terakhir</dt><dd>{formatDate(ticket.updatedAt)} WIB</dd></div>{ticket.dueAt&&<div><dt>Target selesai</dt><dd>{formatDate(ticket.dueAt)} WIB</dd></div>}</dl><div className={styles.timelineHeading}><h3>Riwayat pengerjaan</h3><span>Terbaru dahulu</span></div><ol>{events.toReversed().map((event,index)=><li key={`${event.createdAt}-${index}`}><span aria-hidden="true"/><div><strong>{label(event.status)}</strong><time dateTime={event.createdAt}>{formatDate(event.createdAt)} WIB</time></div>{index===0&&<small>Terbaru</small>}</li>)}</ol>{!events.length&&<p className={styles.description}>Riwayat tahap servis belum tersedia.</p>}</section>}
      </div>
      </div>
      <footer className={styles.footer}>{ticket&&<button type="button" className={styles.reset} onClick={()=>{setTicket(null);setError("");requestAnimationFrame(()=>codeInput.current?.focus());}}>← Cek kode lain</button>}<p className={styles.privacy}>Kode bersifat pribadi. Identitas pelanggan tidak ditampilkan.</p></footer>
    </dialog>
  </>;
}
