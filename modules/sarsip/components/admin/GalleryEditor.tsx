"use client";

import { describeApiProblem } from "@/lib/api-problem";
import { formatNumericText } from "@/lib/number-format";

import Image from "next/image";
import styles from "./Admin.module.css";
import { useState } from "react";
import type { SarsipGalleryPhoto } from "@/contracts/modules/sarsip";
export function GalleryEditor({ value, onChange, disabled, onUploadingChange }: { value: SarsipGalleryPhoto[]; onChange: (photos: SarsipGalleryPhoto[]) => void; disabled: boolean; onUploadingChange: (busy: boolean) => void }) {
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  async function upload(files: File[]) {
    if (!files.length || uploading || disabled) return;
    if (value.length + files.length > 12) { setError("Maksimal 12 foto galeri."); return; }
    if (files.some(file => !["image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp", "image/avif"].includes(file.type) || !file.size || file.size > 10 * 1024 * 1024)) { setError("Gunakan JPG, PNG, WebP, GIF, BMP, atau AVIF, maksimal 10 MB per foto."); return; }
    setUploading(true); onUploadingChange(true); setError("");
    const next = [...value];
    try {
      for (const file of files) {
        const form = new FormData(); form.append("file", file);
        const response = await fetch("/api/sarsip/upload", { method: "POST", body: form });
        const data = await response.json();
        if (!response.ok || typeof data.url !== "string") throw new Error(describeApiProblem(data, 0, "Gagal mengunggah foto galeri. Foto yang berhasil tetap tersimpan dalam form."));
        next.push({ id: crypto.randomUUID(), image: data.url, caption: "" });
        onChange([...next]);
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Upload gagal."); }
    finally { setUploading(false); onUploadingChange(false); }
  }
  return <fieldset disabled={disabled || uploading} className={`${styles.gallery} space-y-3`}>
    <legend className="px-2 text-sm font-semibold">Galeri dokumentasi</legend>
    <p className="text-xs text-foreground/60">Maksimal 12 foto. JPG, PNG, WebP, GIF, BMP, AVIF hingga 10 MB per foto. Semua foto dan keterangannya akan tampil publik saat konten dipublikasikan.</p>
    <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/bmp,image/avif" aria-label="Tambah foto galeri" onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ""; void upload(files); }}/>
    {uploading && <p role="status" className="text-sm">Mengunggah foto…</p>}
    <div className="grid gap-4 sm:grid-cols-2">{value.map((photo, index) => <div key={photo.id} className="space-y-2">
      <Image src={photo.image} alt={`Pratinjau foto galeri ${index + 1}`} width={320} height={200} unoptimized className="aspect-video w-full rounded-xl object-cover"/>
      <label className="block text-xs">Keterangan foto {formatNumericText(index + 1)}<input value={photo.caption ?? ""} maxLength={500} onChange={event => onChange(value.map(row => row.id === photo.id ? { ...row, caption: event.target.value } : row))} className={styles.input}/></label>
      <button type="button" onClick={() => onChange(value.filter(row => row.id !== photo.id))} className="text-xs text-red-600">Hapus dari galeri</button>
    </div>)}</div>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
  </fieldset>;
}
