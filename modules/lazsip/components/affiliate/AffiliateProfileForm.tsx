"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { LazsipAffiliate } from "@/contracts/modules/lazsip";
import { describeApiProblem } from "@/lib/api-problem";
import styles from "./affiliate.module.css";

export function AffiliateProfileForm({ affiliate }: { affiliate: LazsipAffiliate }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    const fields = new FormData(event.currentTarget);
    setPending(true); setError(""); setSaved(false);
    try {
      const response = await fetch("/api/lazsip/affiliate/me", { method: "PUT", headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ name: fields.get("name"), email: fields.get("email"), phone: fields.get("phone") }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(describeApiProblem(result, response.status));
      setSaved(true); router.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Gagal menyimpan. Periksa koneksi lalu coba lagi."); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} onChange={() => setSaved(false)} className={styles.form}>
    <fieldset disabled={pending} className={styles.fields}>
      <label><span>Nama lengkap<span aria-hidden="true" className="ml-1 text-red-600 dark:text-red-400">*</span></span><input name="name" defaultValue={affiliate.name} autoComplete="name" minLength={2} maxLength={100} required/></label>
      <label><span>Email untuk login<span aria-hidden="true" className="ml-1 text-red-600 dark:text-red-400">*</span></span><input name="email" type="email" defaultValue={affiliate.email} autoComplete="email" maxLength={191} required/></label>
      <label><span>Nomor telepon / WhatsApp<span aria-hidden="true" className="ml-1 text-red-600 dark:text-red-400">*</span></span><input name="phone" type="tel" defaultValue={affiliate.phone ?? ""} autoComplete="tel" required pattern="\+?[0-9]{8,15}" maxLength={16} placeholder="081234567890"/><small>8–15 angka tanpa spasi. Boleh diawali +.</small></label>
      <p className={styles.hint}>Email ini digunakan untuk login affiliator. Jika diubah, gunakan email baru saat masuk berikutnya. Nama dan email juga diperbarui pada akun ERP yang sama.</p>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {saved && <p role="status" className={styles.success}>Profil berhasil disimpan.</p>}
      <button className={styles.primary} disabled={pending}>{pending ? "Menyimpan…" : "Simpan profil"}</button>
    </fieldset>
  </form>;
}
