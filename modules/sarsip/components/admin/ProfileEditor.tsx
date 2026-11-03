"use client";
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
        const details = Object.values(result?.error?.details ?? {}).flat().find((value) => typeof value === "string");
        const errorMessage = details ?? result?.error?.message ?? result?.error;
        throw new Error(typeof errorMessage === "string" ? errorMessage : "Gagal menyimpan profil. Coba lagi.");
      }
      setMessage("Profil dan foto hero berhasil disimpan."); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "Gagal menyimpan."); } finally { setBusy(false); }
  }
  const field = "mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground";
  return <form onSubmit={submit} className="max-w-3xl space-y-5 rounded-2xl border border-border bg-surface p-6 text-foreground">
    <label className="block text-sm font-medium">Judul utama halaman publik<input name="headline" required maxLength={191} defaultValue={profile.headline} className={field}/></label>
    <HeroImageField value={heroImage} disabled={busy} onUploadingChange={setUploading} onChange={(url) => { setHeroImage(url); setMessage(""); setError(""); }} />
    <label className="block text-sm font-medium">Tentang tim<textarea name="description" required rows={8} maxLength={10000} defaultValue={profile.description} className={field}/></label>
    <label className="block text-sm font-medium">Kontak koordinasi (publik)<textarea name="contact" rows={3} maxLength={191} defaultValue={profile.contact ?? ""} className={field}/></label>
    {message && <p role="status" className="text-sm text-emerald-600">{message}</p>}
    {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
    <button disabled={busy || uploading} className="rounded-full bg-orange-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-50">{uploading ? "Menunggu upload…" : busy ? "Menyimpan…" : "Simpan profil"}</button>
  </form>;
}

