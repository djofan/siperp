"use client";

import { useState } from "react";

const MAX_SIZE_MB = 2;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export function SipImageUploadField({
  initialUrl,
  onChange,
  label = "Gambar",
  required = false,
}: {
  initialUrl?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  required?: boolean;
}) {
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | null) {
    setError(null);
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Format tidak didukung. Gunakan JPG, PNG, atau WEBP.");
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Ukuran file maksimal ${MAX_SIZE_MB}MB.`);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/sip/upload", { method: "POST", body: formData });
    setUploading(false);

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(data?.error ?? "Gagal mengunggah gambar.");
      setPreview(initialUrl ?? null);
      return;
    }

    const data = await response.json();
    setPreview(data.url);
    onChange(data.url);
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-sip-primary-900">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </label>
      <div className="flex items-center gap-4">
        <div
          className={`flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-dashed bg-sip-primary-50/60 ${
            required && !preview ? "border-red-300" : "border-sip-primary-200"
          }`}
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element -- preview lokal/hasil upload, bukan asset Next dioptimasi
            <img src={preview} alt="Preview" className="h-full w-full object-cover" />
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-7 w-7 text-sip-primary-300">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16l4.5-4.5a2 2 0 0 1 2.8 0L16 16M14 14l1.5-1.5a2 2 0 0 1 2.8 0L20 14M4 6h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z"
              />
            </svg>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="inline-flex w-fit cursor-pointer items-center rounded-full border border-sip-primary-200 px-4 py-2 text-sm font-semibold text-sip-primary-800 transition-colors hover:border-sip-primary-400">
            {uploading ? "Mengunggah..." : "Pilih File"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </label>
          <p className="text-xs text-sip-primary-800/50">Maks {MAX_SIZE_MB}MB — JPG, PNG, atau WEBP.</p>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
