"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { DEFAULT_HERO_IMAGE } from "@/modules/sarsip/brand";

export function HeroImageField({ value, disabled, onChange, onUploadingChange }: {
  value: string | null;
  disabled: boolean;
  onChange: (url: string | null) => void;
  onUploadingChange: (uploading: boolean) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function upload(file?: File) {
    setError("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size === 0 || file.size > 2 * 1024 * 1024) {
      setError("Pilih gambar JPG, PNG, atau WebP, maksimal 2 MB.");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);
    onUploadingChange(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/sarsip/upload", { method: "POST", body });
      const data = await response.json().catch(() => null);
      if (!response.ok || typeof data?.url !== "string" || !data.url) {
        const message = data?.error?.message ?? data?.error;
        throw new Error(typeof message === "string" ? message : "Gagal mengunggah foto hero.");
      }
      onChange(data.url);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Gagal mengunggah foto. Coba lagi.");
    } finally {
      setPreview(null);
      URL.revokeObjectURL(objectUrl);
      setUploading(false);
      onUploadingChange(false);
    }
  }

  return (
    <div className="space-y-3">
      <label htmlFor="sarsip-hero-image" className="block text-sm font-medium">Foto hero halaman utama</label>
      <div className="relative max-w-md overflow-hidden rounded-2xl border border-border bg-slate-900">
        <Image unoptimized src={preview || value || DEFAULT_HERO_IMAGE} alt="Pratinjau foto hero SARSIP" width={600} height={450} className="aspect-[4/3] w-full object-cover" />
        {uploading && <div role="status" className="absolute inset-0 flex items-center justify-center bg-black/60 text-sm font-semibold text-white">Mengunggah foto…</div>}
      </div>
      <input
        ref={input}
        id="sarsip-hero-image"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled || uploading}
        aria-describedby="sarsip-hero-hint"
        className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-orange-600 file:px-4 file:py-2 file:font-semibold file:text-white disabled:opacity-50"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          void upload(file);
        }}
      />
      <p id="sarsip-hero-hint" className="text-xs leading-relaxed text-foreground/60">
        JPG, PNG, atau WebP, maksimal 2 MB. Gunakan foto kegiatan dengan subjek di tengah agar tetap terlihat saat dipotong. Klik Simpan profil untuk menerapkan foto ke beranda.
      </p>
      {value && <button type="button" disabled={disabled || uploading} className="text-sm font-medium text-orange-600 disabled:opacity-50" onClick={() => {
        setError("");
        onChange(null);
        if (input.current) input.current.value = "";
      }}>Hapus foto dan gunakan ilustrasi bawaan</button>}
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
