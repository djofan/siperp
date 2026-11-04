"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import type { BantuanViewer } from "@/contracts/modules/bantuan";
import { canManageOwnPasswordInModule, roleLabel } from "../permissions";
import s from "./AccountMenu.module.css";

export function AccountMenu({viewer,loggingOut,onLogout}:{viewer:BantuanViewer|null;loggingOut:boolean;onLogout:()=>void}) {
  const [open,setOpen]=useState(false);
  const root=useRef<HTMLDivElement>(null);
  const trigger=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!open)return;
    function outside(event:PointerEvent){if(!root.current?.contains(event.target as Node))setOpen(false);}
    function escape(event:KeyboardEvent){if(event.key==="Escape"){setOpen(false);trigger.current?.focus();}}
    document.addEventListener("pointerdown",outside);
    document.addEventListener("keydown",escape);
    return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};
  },[open]);
  const accountHref=viewer&&canManageOwnPasswordInModule(viewer)?"/admin/bantuan/akun":"/admin/pengaturan-akun";
  return <div ref={root} className={s.root} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setOpen(false);}}>
    <button ref={trigger} type="button" className={s.trigger} aria-expanded={open} aria-controls="account-options" aria-label="Buka menu akun" onClick={()=>setOpen(value=>!value)}>
      <span className={s.avatar}>{viewer?.name.slice(0,1)??"A"}</span>
      <span className={s.identity}><strong>{viewer?.name??"Akun saya"}</strong><small>{viewer?roleLabel(viewer):""}</small></span>
      <ChevronDown size={16} className={open?s.rotated:undefined}/>
    </button>
    {open&&<div id="account-options" className={s.panel} aria-label="Pilihan akun">
      <div className={s.summary}><strong>{viewer?.name}</strong><small>{viewer?roleLabel(viewer):""}</small></div>
      <Link href={accountHref} onClick={()=>setOpen(false)}><Settings size={18}/><span>Pengaturan akun<small>Password dan keamanan</small></span></Link>
      <button type="button" onClick={onLogout} disabled={loggingOut}><LogOut size={18}/><span>{loggingOut?"Sedang keluar…":"Keluar"}</span></button>
    </div>}
  </div>;
}
