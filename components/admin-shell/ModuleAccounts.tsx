"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/Button";
import { FormField, Input, Select } from "@/components/ui/FormField";
import { panelClasses } from "@/components/ui/panel";

export interface ManagedAccountData {
  modules: {id:string;name:string;slug:string;roles:Record<string,string>;links:{label:string;href:string}[]}[];
  accounts: {id:string;name:string;code:string;active:boolean;moduleName:string;role:string}[];
}

export function ModuleAccounts({initial}:{initial:ManagedAccountData}) {
  const router=useRouter(),lock=useRef(false);
  const [moduleId,setModuleId]=useState(initial.modules[0]?.id??"");
  const [search,setSearch]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [created,setCreated]=useState<{name:string;code:string}|null>(null);
  const selected=initial.modules.find(module=>module.id===moduleId);
  const accounts=initial.accounts.filter(account=>!search||[account.name,account.code,account.moduleName].join(" ").toLowerCase().includes(search.toLowerCase()));
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(lock.current)return;lock.current=true;setBusy(true);setError("");setCreated(null);
    const form=event.currentTarget;
    try{
      const values=Object.fromEntries(new FormData(form));
      const response=await fetch("/api/core/module-accounts",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...values,moduleId})});
      const result=await response.json();
      if(!response.ok)throw new Error(result.error?.message??"Akun belum berhasil dibuat.");
      setCreated(result.data);form.reset();router.refresh();
    }catch(cause){setError(cause instanceof Error?cause.message:"Gagal terhubung. Silakan coba lagi.");}
    finally{lock.current=false;setBusy(false);}
  }
  return <div className="space-y-6">
    <section className={panelClasses("p-6")}><FormField label="Modul yang dikelola" htmlFor="managed-module"><Select id="managed-module" value={moduleId} onChange={event=>{setModuleId(event.target.value);setError("");setCreated(null);}} disabled={busy}>{initial.modules.map(module=><option key={module.id} value={module.id}>{module.name}</option>)}</Select></FormField>
      {selected&&<div className="mt-6 grid gap-6 lg:grid-cols-2">
        {Object.keys(selected.roles).length>0&&<form key={moduleId} onSubmit={submit} className="space-y-4"><h2 className="text-base font-semibold">Buat akun operasional {selected.name}</h2><FormField label="Nama lengkap" htmlFor="member-name"><Input id="member-name" name="name" required maxLength={191} disabled={busy}/></FormField><FormField label="Peran" htmlFor="member-role"><Select id="member-role" name="role" required disabled={busy}>{Object.entries(selected.roles).map(([role,label])=><option key={role} value={role}>{label}</option>)}</Select></FormField><FormField label="Email kontak (opsional)" htmlFor="member-email"><Input id="member-email" name="email" type="email" maxLength={191} disabled={busy}/></FormField><FormField label="Password awal" htmlFor="member-password" hint="Minimal 12 karakter. Kode login dibuat otomatis."><Input id="member-password" name="password" type="password" autoComplete="new-password" required minLength={12} maxLength={72} disabled={busy}/></FormField><Button type="submit" disabled={busy}>{busy?"Membuat akun…":"Buat akun"}</Button></form>}
        {selected.links.length>0&&<div className="space-y-4"><h2 className="text-base font-semibold">Pendaftaran khusus modul</h2><p className="text-sm leading-6 text-foreground/60">Gunakan formulir modul untuk melengkapi peran, data peserta, atau penempatan petugas.</p><div className="flex flex-wrap gap-3">{selected.links.map(link=><Link key={link.href} href={link.href} className={buttonVariants({variant:"secondary"})}>{link.label} →</Link>)}</div></div>}
      </div>}
      {error&&<p role="alert" className="mt-5 text-sm text-danger">{error}</p>}
      {created&&<div role="status" className="mt-6 rounded-xl bg-accent-soft p-5"><p className="text-sm font-semibold">Akun {created.name} berhasil dibuat.</p><p className="mt-2 font-mono text-xl font-bold text-accent">{created.code}</p><p className="mt-2 text-sm text-foreground/60">Bagikan kode ini dan password awal kepada pemilik akun.</p></div>}
    </section>
    <section className={panelClasses("p-6")}><div className="mb-5 flex flex-wrap items-center justify-between gap-4"><h2 className="font-semibold">Akun operasional pada modul Anda</h2><Input aria-label="Cari akun operasional" placeholder="Cari nama, kode, atau modul…" value={search} onChange={event=>setSearch(event.target.value)} className="max-w-sm"/></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{accounts.map(account=><article key={account.id+account.moduleName} className="rounded-xl bg-surface-muted p-4"><strong className="text-sm">{account.name}</strong><p className="mt-1 font-mono text-sm text-accent">{account.code}</p><p className="mt-3 text-xs text-foreground/60">{account.moduleName} · {initial.modules.find(module=>module.name===account.moduleName)?.roles[account.role]??account.role}</p><p className="mt-1 text-xs text-foreground/60">{account.active?"Aktif":"Nonaktif"}</p></article>)}</div>{!accounts.length&&<p className="py-5 text-sm text-foreground/50">Belum ada akun yang cocok. Akun peserta dan petugas lapangan juga dapat dilihat di menu pendaftaran masing-masing modul.</p>}</section>
  </div>;
}
