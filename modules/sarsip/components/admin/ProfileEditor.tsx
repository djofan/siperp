"use client";
import styles from "./Admin.module.css";
import { Save, FileText, ImagePlus, Settings2 } from "lucide-react";
import { describeApiProblem } from "@/lib/api-problem";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { SarsipProfile } from "@/contracts/modules/sarsip";
import { HeroImageField } from "@/modules/sarsip/components/admin/HeroImageField";
export function ProfileEditor({ profile }: { profile: SarsipProfile }) {
  const router = useRouter(); const [busy,setBusy] = useState(false); const [message,setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [heroImage, setHeroImage] = useState(profile.heroImage ?? null);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy || uploading) return; setBusy(true); setMessage(""); setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try { const response = await fetch("/api/sarsip/profile", { method: "PUT", headers: { "Content-Type":"application/json" }, body: JSON.stringify({ ...data, heroImage }) });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(describeApiProblem(result,response.status,"Gagal menyimpan profil. Coba lagi."));
      }
      setMessage("Profil dan foto hero berhasil disimpan."); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Gagal menyimpan."); } finally { setBusy(false); }
  }
  const field = styles.input;
  return <form onSubmit={submit} className={styles.editor}>
    <div className={styles.editorMain}><section className={styles.panel}><div className={styles.panelHead}><div><h2><FileText size={17}/>Identitas & cerita tim</h2><p>Teks yang tampil di hero dan bagian Tentang SARSIP.</p></div></div><div className={styles.fields}>
      <label className={styles.field}>Judul utama halaman publik <span aria-hidden="true" className={styles.required}>*</span><input name="headline" required maxLength={191} defaultValue={profile.headline} className={field}/></label>
      <label className={styles.field}>Tentang tim <span aria-hidden="true" className={styles.required}>*</span><textarea name="description" required rows={8} maxLength={10000} defaultValue={profile.description} className={field}/></label>
      <label className={styles.field}>Kontak koordinasi (publik)<textarea name="contact" rows={3} maxLength={191} defaultValue={profile.contact??""} className={field}/><small className={styles.hint}>Gunakan kontak resmi yang boleh diakses pengunjung.</small></label>
    </div></section><section className={styles.panel}><div className={styles.panelHead}><div><h2><ImagePlus size={17}/>Foto utama</h2><p>Dokumentasi tim yang mewakili kegiatan SARSIP.</p></div></div><HeroImageField value={heroImage} disabled={busy} onUploadingChange={setUploading} onChange={url=>{setHeroImage(url);setMessage("");setError("");}}/></section></div>
    <aside className={styles.editorAside}><section className={styles.panel}><div className={styles.panelHead}><div><h2><Settings2 size={17}/>Simpan profil</h2><p>Perubahan akan digunakan pada halaman publik.</p></div></div><div className={styles.fields}><div className={styles.notice}><strong>Informasi resmi SARSIP</strong>Periksa kembali penulisan dan kontak sebelum menyimpan.</div>{message&&<p role="status" className={styles.success}>{message}</p>}{error&&<p role="alert" className={styles.error}>{error}</p>}<button disabled={busy||uploading} className={styles.primary}><Save size={15}/>{uploading?"Menunggu upload…":busy?"Menyimpan…":"Simpan profil"}</button></div></section></aside>
  </form>;
}
