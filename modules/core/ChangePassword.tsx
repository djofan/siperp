"use client";
import { useState, type FormEvent } from "react";
import s from "./ChangePassword.module.css";

export function ChangePassword({initiallyOpen=false,theme="light"}:{initiallyOpen?:boolean;theme?:"light"|"dark"}){
  const [visible,setVisible]=useState<Record<string,boolean>>({});
  const [open,setOpen]=useState(initiallyOpen),[busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=event.currentTarget;
    const fields=new FormData(form);
    const confirmation=form.elements.namedItem("password_confirmation") as HTMLInputElement;
    confirmation.setCustomValidity(fields.get("password")!==fields.get("password_confirmation")?"Konfirmasi password belum sama.":"");
    if(!form.reportValidity())return;
    setBusy(true);setError("");setSuccess("");
    try{
      const response=await fetch("/api/auth/password",{method:"PUT",headers:{"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify(Object.fromEntries(new FormData(form)))});
      const body=await response.json();
      if(!response.ok)throw new Error(response.status===422?"Periksa password saat ini. Password baru minimal 12 karakter, berbeda dari sebelumnya, dan konfirmasinya harus sama.":response.status===429?"Terlalu banyak percobaan. Tunggu satu menit lalu coba lagi.":"Password belum berhasil diubah. Pastikan Anda masih masuk.");
      form.reset();setSuccess(body.data.message);
    }catch(e){setError(e instanceof Error?e.message:"Tidak dapat terhubung. Silakan coba lagi.");}
    finally{setBusy(false);}
  }
  return <div className={s.root} data-theme={theme}>
    {!initiallyOpen&&<button className={s.toggle} type="button" onClick={()=>{setOpen(!open);setError("");setSuccess("");}} aria-expanded={open}>Ubah password</button>}
    {open&&<form className={s.form} onSubmit={submit}>
      <div className={s.heading}><span className={s.lock} aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="5" y="10" width="14" height="11" rx="3"/><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3"/></svg></span><div><h2>Ubah password</h2><p>Perbarui password untuk menjaga keamanan akun Anda.</p></div></div>
      <div className={s.fields}>
        {[["current_password","Password saat ini","current-password","Masukkan password saat ini"],["password","Password baru","new-password","Buat password baru"],["password_confirmation","Konfirmasi password","new-password","Ulangi password baru"]].map(([name,label,autoComplete,placeholder])=><div className={`${s.field} ${name==="current_password"?s.current:""}`} key={name}>
          <label htmlFor={`account-${name}`}>{label}</label>
          <div className={s.inputWrap}><input id={`account-${name}`} name={name} placeholder={placeholder} type={visible[name]?"text":"password"} onInput={e=>{e.currentTarget.setCustomValidity("");const confirm=e.currentTarget.form?.elements.namedItem("password_confirmation") as HTMLInputElement|null;confirm?.setCustomValidity("");setSuccess("");}} autoComplete={autoComplete} required minLength={name==="current_password"?1:12} maxLength={128} disabled={busy}/><button type="button" className={s.reveal} title={`${visible[name]?"Sembunyikan":"Tampilkan"} password`} aria-label={`${visible[name]?"Sembunyikan":"Tampilkan"} ${label.toLowerCase()}`} aria-pressed={!!visible[name]} onClick={()=>setVisible(v=>({...v,[name]:!v[name]}))}><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>{visible[name]&&<path d="m3 3 18 18"/>}</svg></button></div>
        </div>)}
      </div>
      <p className={s.hint}>Gunakan minimal 12 karakter, berbeda dari password sebelumnya.</p>
      {error&&<p role="alert" className={s.error}>{error}</p>}
      {success&&<p className={s.success} role="status">{success}</p>}
      <div className={s.footer}><p>Setelah disimpan, sesi di perangkat lain akan diakhiri.</p><button className={s.submit} type="submit" disabled={busy}>{busy?"Menyimpan…":"Simpan perubahan"}<span aria-hidden="true">→</span></button></div>
    </form>}
  </div>;
}
