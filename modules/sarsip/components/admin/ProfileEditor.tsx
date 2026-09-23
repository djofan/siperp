"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
export function ProfileEditor({ profile }: { profile: { headline: string; description: string; contact: string | null } }) {
  const router = useRouter(); const [busy,setBusy] = useState(false); const [message,setMessage] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return; setBusy(true); setMessage("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try { const response = await fetch("/api/sarsip/profile", { method: "PUT", headers: { "Content-Type":"application/json" }, body: JSON.stringify(data) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      setMessage("Profil berhasil disimpan."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Gagal menyimpan."); } finally { setBusy(false); }
  }
  const field = "mt-2 w-full rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground";
  return <form onSubmit={submit} className="max-w-3xl space-y-5 rounded-2xl border border-border bg-surface p-6 text-foreground"><label className="block text-sm font-medium">Judul utama halaman publik<input name="headline" required maxLength={191} defaultValue={profile.headline} className={field}/></label><label className="block text-sm font-medium">Tentang tim<textarea name="description" required rows={8} maxLength={10000} defaultValue={profile.description} className={field}/></label><label className="block text-sm font-medium">Kontak koordinasi (publik)<textarea name="contact" rows={3} maxLength={191} defaultValue={profile.contact ?? ""} className={field}/></label>{message && <p role="status" className="text-sm">{message}</p>}<button disabled={busy} className="rounded-full bg-orange-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? "Menyimpan…" : "Simpan profil"}</button></form>;
}

