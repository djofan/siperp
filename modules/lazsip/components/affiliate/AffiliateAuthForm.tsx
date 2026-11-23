"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { describeApiProblem } from "@/lib/api-problem";
import styles from "./affiliate.module.css";

export function AffiliateAuthForm({ register = false }: { register?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [show, setShow] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const fields = new FormData(event.currentTarget);
    const body = register ? {
      name: fields.get("name"), email: fields.get("email"), phone: fields.get("phone"),
      password: fields.get("password"), password_confirmation: fields.get("password_confirmation"),
    } : { email: fields.get("email"), password: fields.get("password"), remember: fields.get("remember") === "on" };
    setPending(true); setError("");
    try {
      const response = await fetch(`/api/lazsip/affiliate/${register ? "registrations" : "sessions"}`, {
        method: "POST", headers: { Accept: "application/json", "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(describeApiProblem(result, response.status, "Permintaan belum berhasil. Silakan coba lagi."));
      router.replace(`/lazsip/affiliator${register ? "?welcome=1" : ""}`); router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Tidak dapat terhubung. Periksa koneksi lalu coba lagi."); setPending(false);
    }
  }
  return <form onSubmit={submit} className={styles.form} aria-busy={pending}>
    <fieldset disabled={pending} className={styles.fields}>
      {register ? <>
        <label>Nama lengkap<input name="name" autoComplete="name" required minLength={2} maxLength={100}/></label>
        <label>Email<input name="email" type="email" autoComplete="email" required maxLength={191}/></label>
        <label>Nomor telepon / WhatsApp<input name="phone" type="tel" autoComplete="tel" inputMode="tel" required pattern="\+?[0-9]{8,15}" maxLength={16} placeholder="081234567890"/><small>8–15 angka tanpa spasi. Boleh diawali + untuk kode negara.</small></label>
      </> : <label>Email<input name="email" type="email" autoComplete="username" required maxLength={191} placeholder="nama@email.com" autoCapitalize="none" spellCheck={false}/><small>Gunakan email yang Anda daftarkan.</small></label>}
      <label>Password<input name="password" type={show ? "text" : "password"} autoComplete={register ? "new-password" : "current-password"} required minLength={register ? 12 : undefined} maxLength={72}/>{register && <small>Minimal 12 karakter. Jangan gunakan password yang mudah ditebak.</small>}</label>
      {register && <label>Konfirmasi password<input name="password_confirmation" type={show ? "text" : "password"} autoComplete="new-password" required minLength={12} maxLength={72}/></label>}
      <label className={styles.check}><input type="checkbox" checked={show} onChange={event => setShow(event.target.checked)}/>Tampilkan password</label>
      {!register && <><label className={styles.check}><input name="remember" type="checkbox"/>Ingat saya di perangkat ini</label><p className={styles.hint}>Belum pernah bergabung? Masuk dengan email akun ERP Anda akan langsung mengaktifkan keanggotaan affiliator Anda, tanpa persetujuan admin.</p></>}
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <button className={styles.primary} disabled={pending}>{pending ? "Memproses…" : register ? "Daftar & buka panel" : "Masuk ke panel"}</button>
    </fieldset>
    <p className={styles.switch}>{register ? "Sudah punya akun ERP atau affiliator?" : "Belum punya akun?"} <Link href={`/lazsip/affiliator/${register ? "masuk" : "daftar"}`}>{register ? "Masuk di sini" : "Jadi Affiliator"}</Link></p>
  </form>;
}
