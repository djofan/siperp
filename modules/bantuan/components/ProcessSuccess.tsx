"use client";
import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Button, Dialog } from "./ui";
import s from "./Workspace.module.css";

export function ProcessSuccess({title,description,onContinue}:{title:string;description:string;onContinue?:()=>void}){
  const router=useRouter(),leaving=useRef(false);
  const proceed=useCallback(()=>{
    if(leaving.current)return;
    leaving.current=true;
    onContinue?.();
    router.replace("/admin/bantuan/pengajuan");
    router.refresh();
  },[onContinue,router]);
  useEffect(()=>{
    const timer=setTimeout(proceed,2200);
    return()=>clearTimeout(timer);
  },[proceed]);
  return <Dialog title={title} onClose={proceed}><div className={s.processSuccess} role="status" aria-live="polite">
    <span className={s.processSuccessIcon}><Check size={34} strokeWidth={2.3} aria-hidden="true"/></span>
    <p>{description}</p><small>Anda akan kembali ke daftar pengajuan.</small>
    <div className={s.processSuccessProgress} aria-hidden="true"><span/></div>
    <Button type="button" onClick={proceed}>Kembali ke daftar sekarang</Button>
  </div></Dialog>;
}
