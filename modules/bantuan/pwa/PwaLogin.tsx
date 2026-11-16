"use client";
import { OrganizationContact } from "@/components/OrganizationContact";
import { useState,type FormEvent } from "react";
import Link from "next/link";
import { Eye,EyeOff,ArrowRight,HeartHandshake,ShieldCheck } from "lucide-react";
import s from "./Pwa.module.css";
export function PwaLogin() {
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[show,setShow]=useState(false);
  async function login(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();if(busy)return;setBusy(true);setError("");
    const form=new FormData(event.currentTarget);
    try {
      const response=await fetch("/api/auth/login",{method:"POST",credentials:"same-origin",cache:"no-store",headers:{"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify({code:String(form.get("code")).trim().toUpperCase(),password:form.get("password"),pwa:true})});
      const data=await response.json().catch(()=>null);
      if(!response.ok)throw new Error(data?.error?.message??"Kode akun atau password salah.");
      const access=await fetch("/api/bantuan/viewer",{cache:"no-store",credentials:"same-origin",headers:{Accept:"application/json"}});
      if(!access.ok)throw new Error(access.status===403?"Akun ini belum memiliki akses Bantuan atau modul sedang tidak aktif. Hubungi pengelola.":"Akses Bantuan belum dapat diperiksa. Coba kembali.");
      window.location.replace("/bantuan-app/beranda");
    } catch(err) {setError(err instanceof Error?err.message:"Tidak dapat terhubung. Periksa koneksi internet.");setBusy(false);}
  }
  return <main className={s.login}>
    <div className={s.loginBrand}><span className={s.mark}><HeartHandshake size={30}/></span><span>BANTUAN <b>SIP</b></span></div>
    <div className={s.loginIntro}><span className={s.eyebrow}>BERSAMA MENEBAR KEBAIKAN</span><h1>Langkah kecil.<br/>Manfaat yang berarti.</h1><p>Kelola tugas lapangan dan penyaluran bantuan, langsung dari genggaman.</p></div>
    <form onSubmit={login} className={s.loginCard}>
      <h2>Selamat datang kembali</h2><p>Masuk menggunakan akun SIP Anda.</p>
      {error&&<div className={s.error} role="alert">{error}</div>}
      <label>Kode akun<input name="code" autoComplete="username" autoCapitalize="characters" spellCheck={false} placeholder="Kode akun dari pengelola" minLength={3} maxLength={32} pattern="[a-zA-Z0-9][a-zA-Z0-9_-]{2,31}" required disabled={busy}/></label>
      <label>Password<span className={s.password}><input name="password" type={show?"text":"password"} autoComplete="current-password" placeholder="Masukkan password" maxLength={72} required disabled={busy}/><button type="button" aria-label={show?"Sembunyikan password":"Tampilkan password"} aria-pressed={show} onClick={()=>setShow(value=>!value)}>{show?<EyeOff size={19}/>:<Eye size={19}/>}</button></span></label>
      <button className={s.primary} disabled={busy}>{busy?"Memeriksa akun…":"Masuk ke aplikasi"}<ArrowRight size={18}/></button>
      <p className={s.help}>Lupa kode akun atau password? Hubungi admin pengelola Bantuan.</p>
    </form>
    <div className={s.loginFoot}><ShieldCheck size={16}/>Akses internal · Akun dan hak akses yang sama dengan web</div>
    <OrganizationContact/><Link className={s.webLink} href="/">Kembali ke website SIP</Link>
  </main>;
}
