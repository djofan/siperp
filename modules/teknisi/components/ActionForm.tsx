"use client";
import { useActionState, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
export type ActionState = { error?: string; success?: string };
export function ActionForm({ action, children, submit = "Simpan", className = "", confirmMessage }: { action: (state: ActionState, form: FormData) => Promise<ActionState>; children: React.ReactNode; submit?: string; className?: string; confirmMessage?: string }) {
  const [state, formAction, pending] = useActionState(action, {});
  const titleId=useId();
  const dialog=useRef<HTMLDialogElement>(null),form=useRef<HTMLFormElement>(null),approved=useRef(false),[message,setMessage]=useState("");
  return <form ref={form} action={formAction} onSubmit={event=>{if(!confirmMessage||approved.current){approved.current=false;return;}event.preventDefault();const values=new FormData(event.currentTarget);const price=values.get("serviceCost");setMessage(`${confirmMessage}${price!==null?` Biaya jasa tercatat Rp${Number(price).toLocaleString("id-ID")}.`:""}`);dialog.current?.showModal();}} className={`space-y-4 ${className}`}>{children}{state.error && <p role="alert" className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{state.error}</p>}{state.success && <p role="status" className="text-sm text-emerald-500">{state.success}</p>}<Button disabled={pending} type="submit">{pending ? "Menyimpan…" : submit}</Button>{confirmMessage&&<dialog ref={dialog} className="tech-confirm" aria-labelledby={titleId}><h2 id={titleId}>Konfirmasi tindakan</h2><p>{message}</p><div className="tech-toolbar"><button type="button" className="tech-btn secondary" onClick={()=>dialog.current?.close()}>Periksa lagi</button><button type="button" className="tech-btn" onClick={()=>{approved.current=true;dialog.current?.close();form.current?.requestSubmit();}}>Ya, lanjutkan</button></div></dialog>}</form>;
}
