"use client";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { saveFinance, type FinanceActionState } from "../api/actions";
export function FinanceForm({kind,id=null,requestId,children,label}:{kind:Parameters<typeof saveFinance>[0];id?:string|null;requestId:string;children:ReactNode;label:string}) {
  const [state,action,pending]=useActionState<FinanceActionState,FormData>(saveFinance.bind(null,kind,id),{error:""});
  const form=useRef<HTMLFormElement>(null);
  const submitted=useRef<FormData|null>(null);
  useEffect(()=>{if(state.error && form.current && submitted.current) {
    for(const element of Array.from(form.current.elements)) {
      if(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
        if(element instanceof HTMLInputElement && element.type==="checkbox") element.checked=submitted.current.getAll(element.name).includes(element.value);
        else if(element.name && submitted.current.has(element.name)) element.value=String(submitted.current.get(element.name));
      }
    }
  } if(state.error)form.current?.querySelector<HTMLElement>('[role="alert"]')?.focus();},[state]);
  return <form ref={form} onSubmit={()=>{if(form.current)submitted.current=new FormData(form.current);}} action={action} className="finance-form"><input type="hidden" name="requestId" value={requestId}/>{state.error&&<p role="alert" tabIndex={-1}>{state.error}</p>}<fieldset disabled={pending}>{children}<button type="submit" disabled={pending}>{pending?"Menyimpan…":label}</button></fieldset></form>;
}
