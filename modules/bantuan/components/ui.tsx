"use client";

import { useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Bell, Camera, Check, CheckCircle2, ChevronRight, ClipboardCheck, ClipboardList, Clock3, FileText, Files, HandHeart, History, Inbox, LayoutDashboard, LogOut, Menu, Plus, Search, Settings2, ShieldCheck, Upload, UsersRound, Wallet, X } from "lucide-react";
import { bantuanStatuses } from "@/contracts/modules/bantuan";
import { lockPageScroll } from "../scroll-lock";
import s from "./Workspace.module.css";

export function Icon({name,className}:{name:string;className?:string}){
  const icons={layout:LayoutDashboard,grid:LayoutDashboard,files:Files,file:FileText,inbox:Inbox,check:ClipboardCheck,clipboard:ClipboardList,clock:Clock3,hand:HandHeart,wallet:Wallet,history:History,chart:FileText,users:UsersRound,settings:Settings2,shield:ShieldCheck,bell:Bell,plus:Plus,search:Search,menu:Menu,logout:LogOut,arrow:ArrowRight,back:ArrowLeft,camera:Camera,upload:Upload,close:X,done:Check};
  const Component=icons[name as keyof typeof icons]??FileText;return <Component aria-hidden="true" size={18} strokeWidth={1.7} className={className}/>;
}
export function Button({variant="primary",className="",...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:"primary"|"secondary"|"danger"|"ghost"}){
  return <button {...props} className={`${s.button} ${variant==="secondary"?s.secondary:variant==="danger"?s.danger:variant==="ghost"?s.ghost:""} ${className}`}/>;
}
export function Card({title,description,action,children,className=""}:{title?:string;description?:string;action?:ReactNode;children:ReactNode;className?:string}){
  return <section className={`${s.card} ${className}`}>{title&&<div className={s.cardHeader}><div><h2>{title}</h2>{description&&<p>{description}</p>}</div>{action}</div>}<div className={s.cardBody}>{children}</div></section>;
}
export function Badge({status}:{status:string}){
  const tone=status==="completed"?s.green:status.startsWith("rejected")||["cancelled","delivery_failed"].includes(status)?s.red:
    ["review1","survey_submitted","bypass_review","review2","fund_submitted","needs_data"].includes(status)?s.amber:"";
  return <span className={`${s.badge} ${tone}`}>{bantuanStatuses[status]??status}</span>;
}
export function Input({label,error,hint,...props}:InputHTMLAttributes<HTMLInputElement>&{label:string;error?:string;hint?:string}){
  const id=useId();return <label className={s.field} htmlFor={id}><span>{label}{props.required&&<em> *</em>}</span><input {...props} id={id} className={s.input} aria-invalid={!!error} aria-describedby={error||hint?id+"-help":undefined}/>{(error||hint)&&<small id={id+"-help"} className={error?s.fieldError:undefined}>{error??hint}</small>}</label>;
}
export function EmptyState({title="Antrean sudah bersih",description="Tidak ada pengajuan yang perlu ditangani di sini.",action}:{title?:string;description?:string;action?:ReactNode}){
  return <div className={s.empty}><span className={s.emptyIcon}><Inbox size={27} strokeWidth={1.3}/></span><h3>{title}</h3><p>{description}</p>{action}</div>;
}
export function Skeleton(){return <div role="status" aria-label="Memuat pengajuan" className={s.skeleton}>{[1,2,3,4].map(i=><div key={i} className={s.skeletonLine}/>)}<span className={s.srOnly}>Memuat…</span></div>;}
export function Toast({message,onClose}:{message:string;onClose:()=>void}){
  useEffect(()=>{const id=setTimeout(onClose,6500);return()=>clearTimeout(id);},[message,onClose]);
  return <div role="status" className={s.toast}><CheckCircle2 size={21}/><span>{message}</span><button aria-label="Tutup notifikasi" onClick={onClose}><X size={17}/></button></div>;
}
export function Dialog({title,description,children,onClose,wide=false}:{title:string;description?:string;children:ReactNode;onClose:()=>void;wide?:boolean}){
  const ref=useRef<HTMLDialogElement>(null),id=useId();
  useEffect(()=>{
    const element=ref.current;if(!element)return;
    const unlock=lockPageScroll(element.ownerDocument);
    try{element.showModal();}catch(error){unlock();throw error;}
    return()=>{try{element.close();}finally{unlock();}};
  },[]);
  return <dialog ref={ref} className={`${s.dialog} ${wide?s.wideDialog:""}`} aria-labelledby={id} aria-describedby={description?id+"-description":undefined} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
    <div className={s.dialogHeader}><div><h2 id={id}>{title}</h2>{description&&<p id={id+"-description"}>{description}</p>}</div><button aria-label="Tutup dialog" className={s.iconButton} onClick={onClose} type="button"><X size={18}/></button></div>
    <div className={s.dialogBody}>{children}</div>
  </dialog>;
}
export function Tabs({items,active,onChange}:{items:{id:string;label:string;count?:number}[];active:string;onChange:(id:string)=>void}){
  return <div className={s.tabs} role="tablist">{items.map(item=><button key={item.id} role="tab" aria-selected={active===item.id} className={active===item.id?s.activeTab:undefined} onClick={()=>onChange(item.id)}>{item.label}{item.count!==undefined&&<span>{item.count}</span>}</button>)}</div>;
}
export function Breadcrumb({items}:{items:string[]}){return <div className={s.breadcrumb}>{items.map((item,i)=><span key={i}>{i>0&&<ChevronRight size={12}/>}<span>{item}</span></span>)}</div>;}
