"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Building2, ChevronRight, CircleUserRound, ContactRound, CreditCard, DatabaseBackup, LayoutDashboard, Layers3, LogOut, Menu, Search, ShieldCheck, Users, Wallet, X } from "lucide-react";
import type { NavGroup } from "./Sidebar";
import s from "./CoreChrome.module.css";
import dark from "./CoreDark.module.css";
import { AdminGradientBackground } from "./AdminGradientBackground";

const menuInfo:Record<string,{description:string;icon:typeof Layers3}>={
  "/admin":{description:"Ringkasan ruang kerja",icon:LayoutDashboard},
  "/admin/modul":{description:"Pilih modul untuk bekerja",icon:Layers3},
  "/admin/super":{description:"Operasional lintas modul",icon:Building2},
  "/admin/super/akun":{description:"Identitas dan akses admin",icon:Users},
  "/admin/super/modul":{description:"Status modul platform",icon:Layers3},
  "/admin/super/kontak":{description:"Direktori kontak terpadu",icon:ContactRound},
  "/admin/super/keuangan":{description:"Transaksi dan rekonsiliasi",icon:Wallet},
  "/admin/super/backup":{description:"Cadangan dan pemulihan data",icon:DatabaseBackup},
  "/admin/super/rekening-payment":{description:"Tujuan penerimaan dana",icon:CreditCard},
  "/admin/akun-modul":{description:"Anggota dan peran tim",icon:CircleUserRound},
};

export function CoreChrome({groups,userName,isSuperadmin,children}:{groups:NavGroup[];userName:string;isSuperadmin:boolean;children:React.ReactNode}){
  const pathname=usePathname(),router=useRouter(),[open,setOpen]=useState(false),[query,setQuery]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const toggle=useRef<HTMLButtonElement>(null),drawer=useRef<HTMLElement>(null);
  useEffect(()=>{
    const nav=drawer.current?.querySelector('nav');
    const current=nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if(!nav)return;
    if(pathname==="/admin")nav.scrollTop=0;
    else if(current){const box=current.getBoundingClientRect(),viewport=nav.getBoundingClientRect();if(box.top<viewport.top||box.bottom>viewport.bottom)nav.scrollTop+=box.top-viewport.top-12;}
  },[pathname]);
  const items=groups.flatMap(group=>group.items),active=[...items].sort((a,b)=>b.href.length-a.href.length).find(item=>pathname===item.href||pathname.startsWith(item.href+"/"));
  const matches=query.trim()?items.filter(item=>`${item.label} ${menuInfo[item.href]?.description}`.toLowerCase().includes(query.trim().toLowerCase())):[];
  const role=isSuperadmin?"Superadmin":"Admin Modul",initials=userName.split(" ").filter(Boolean).slice(0,2).map(word=>word[0]).join("");
  useEffect(()=>{
    if(!open)return;
    drawer.current?.querySelector<HTMLElement>('a,button')?.focus();
    const handler=(e:KeyboardEvent)=>{
      if(e.key==="Escape"){setOpen(false);toggle.current?.focus();}
      if(e.key==="Tab"){
        const nodes=drawer.current?.querySelectorAll<HTMLElement>('a,button,input');if(!nodes?.length)return;
        const first=nodes[0],last=nodes[nodes.length-1];
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
      }
    };document.addEventListener("keydown",handler);return()=>document.removeEventListener("keydown",handler);
  },[open]);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 851px)");
    const reset = () => { if (media.matches) setOpen(false); };
    media.addEventListener("change", reset);
    return () => media.removeEventListener("change", reset);
  }, []);
  async function logout(){setBusy(true);setError("");try{const response=await fetch("/api/auth/logout",{method:"POST"});if(!response.ok)throw Error("Belum berhasil keluar. Coba lagi.");router.replace("/admin/login");router.refresh();}catch(e){setError(e instanceof Error?e.message:"Gagal keluar.");setBusy(false);}}
  return <div className={`${s.shell} ${dark.chrome} dark`} data-role={isSuperadmin?"super":"admin"}>
    <AdminGradientBackground glow="115,174,67" placement={isSuperadmin?"top":"corners"}/>
    {open&&<button className={s.overlay} aria-label="Tutup menu" onClick={()=>{setOpen(false);toggle.current?.focus();}}/>}
    <aside ref={drawer} className={s.sidebar} data-open={open} aria-label={`Navigasi ${role}`}>
      <Link href="/admin" className={s.brand} onClick={()=>setOpen(false)}><Image src="/lazsip-logo.png" alt="LAZSIP — Solidaritas Insan Peduli" width={142} height={50} priority/><span>PLATFORM SOLIDARITAS INSAN PEDULI</span></Link>
      <div className={s.roleCard}><ShieldCheck size={18}/><div><strong>{isSuperadmin?"Pusat kendali":"Ruang kerja admin"}</strong><small>{isSuperadmin?"Pengelolaan seluruh platform":"Operasional modul Anda"}</small></div><button className={s.close} onClick={()=>{setOpen(false);toggle.current?.focus();}} aria-label="Tutup menu"><X size={18}/></button></div>
      <nav className={s.nav}>{groups.map((group,index)=><section key={index}><h2>{group.heading??"MENU UTAMA"}</h2>{group.items.map(item=>{const info=menuInfo[item.href],Icon=info?.icon??Layers3;return <Link key={item.href} href={item.href} onClick={()=>setOpen(false)} aria-current={active?.href===item.href?"page":undefined}><Icon size={18}/><span><strong>{item.label}</strong><small>{info?.description}</small></span>{active?.href===item.href&&<ChevronRight size={14}/>}</Link>;})}</section>)}</nav>
      <div className={s.account}><span className={s.avatar}>{initials}</span><div><strong>{userName}</strong><small>{role}</small></div><button onClick={()=>void logout()} disabled={busy} title="Keluar dari akun" aria-label="Keluar dari akun"><LogOut size={18}/></button></div>{error&&<p role="alert" className={s.error}>{error}</p>}
    </aside>
    <div className={s.body} inert={open||undefined}>
      <header className={s.topbar}><button ref={toggle} className={s.menu} onClick={()=>setOpen(true)} aria-label="Buka navigasi" aria-expanded={open}><Menu size={20}/></button><div className={s.breadcrumb}><span>{isSuperadmin?"Pusat kendali":"Ruang kerja"}</span><ChevronRight size={13}/><strong>{active?.label??"Dashboard"}</strong></div>
      <div className={s.search}><Search size={17}/><input aria-label="Cari menu Core" placeholder="Cari menu atau pengaturan…" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==="Escape")setQuery("");}}/>{query&&<div className={s.results}>{matches.length?matches.map(item=><Link key={item.href} href={item.href} onClick={()=>setQuery("")}>{item.label}<ArrowUpRight size={14}/></Link>):<p>Menu tidak ditemukan.</p>}</div>}</div>
      <span className={s.roleBadge}><ShieldCheck size={14}/>{role}</span><span className={s.avatar} title={userName}>{initials}</span></header>
      <main className={s.main}>{children}<footer className={s.footer}>Solidaritas Insan Peduli <span>·</span> {isSuperadmin?"Pusat pengelolaan platform":"Ruang kerja modul"}</footer></main>
    </div>
  </div>;
}
