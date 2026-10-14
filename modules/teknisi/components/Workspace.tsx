"use client";
import Link from "next/link";
import { usePathname,useSearchParams } from "next/navigation";
import { useState,useEffect,useRef } from "react";
import { stages } from "../api/workflow-policy";
import "./workspace.css";
import "./lazsip-theme.css";
export function Workspace({name,subtitle,root,admin=false,children}:{name:string;subtitle:string;root:string;admin?:boolean;children:React.ReactNode}){
 const path=usePathname(),query=useSearchParams(),[open,setOpen]=useState(false),[leaving,setLeaving]=useState(false),[error,setError]=useState("");
 const drawer=useRef<HTMLElement>(null);
 useEffect(()=>{if(!open)return;const previous=document.activeElement as HTMLElement|null;drawer.current?.querySelector<HTMLElement>("a,button")?.focus();return()=>previous?.focus();},[open]);
 function drawerKeys(event:React.KeyboardEvent){if(!open)return;if(event.key==="Escape"){setOpen(false);return;}if(event.key!=="Tab")return;const items=Array.from(drawer.current?.querySelectorAll<HTMLElement>("a,button")??[]),first=items[0],last=items.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
 const links=[{href:root,label:admin?"Overview outlet":"Dashboard"},...Object.entries(stages).filter(([key])=>key!=="cancelled").map(([key,label])=>({href:`${root}/tiket?stage=${key}`,label})),{href:`${root}/laporan`,label:"Laporan"},{href:`${root}/outlet`,label:admin?"Outlet":"Informasi outlet"},...(admin?[{href:`${root}/teknisi`,label:"Akun teknisi"}]:[{href:`${root}/profil`,label:"Profil saya"}])];
 async function logout(){setLeaving(true);try{const result=await fetch("/api/auth/logout",{method:"POST"});if(!result.ok)throw new Error();window.location.assign(admin?"/admin/login":"/teknisi/masuk");}catch{setLeaving(false);setError("Belum berhasil keluar. Coba lagi.");}}
 const isActive=(href:string)=>href.includes("?")?path===`${root}/tiket`&&(query.get("stage")??"pending")===href.split("stage=")[1]:href===root?path===root:path===href||path.startsWith(`${href}/`);
 return <div className="tech-workspace">
  <a className="sr-only focus:not-sr-only" href="#tech-main">Lewati ke konten</a>
  {open&&<button className="tech-backdrop" aria-label="Tutup menu" onClick={()=>setOpen(false)}/>}
  <aside ref={drawer} role={open?"dialog":undefined} aria-modal={open?true:undefined} aria-label="Navigasi Teknisi HP" onKeyDown={drawerKeys} className={`tech-sidebar ${open?"is-open":""}`}>
   <Link href={root} className="tech-brand">Teknisi<span>HP</span></Link><p className="tech-subtitle">{subtitle}</p>
   <button className="tech-mobile-close" onClick={()=>setOpen(false)} aria-label="Tutup menu">×</button>
   <nav aria-label="Menu Teknisi HP">{links.map(item=><Link key={item.href} href={item.href} onClick={()=>setOpen(false)} aria-current={isActive(item.href)?"page":undefined} className={isActive(item.href)?"is-active":""}>{item.label}</Link>)}</nav>
   <div className="tech-account"><strong>{name}</strong><span>{admin?"Pengelola pusat":"Teknisi outlet"}</span>{admin&&<Link href="/admin">← Kembali ke Core</Link>}</div>
  </aside>
  <div className="tech-frame">
   <header className="tech-topbar"><button className="tech-mobile-menu" aria-label="Buka menu" aria-expanded={open} onClick={()=>setOpen(true)}>☰</button><span>{subtitle}</span><div><Link href="/teknisi">Lihat website ↗</Link><button onClick={logout} disabled={leaving}>{leaving?"Memproses…":"Keluar"}</button></div></header>
   {error&&<p role="alert">{error}</p>}<main id="tech-main" className="tech-main">{children}</main>
  </div>
 </div>;
}
