"use client";

import { useRouter } from "next/navigation";

// Dinamis: balik ke halaman asal (landing page kalau dibuka dari "Baca Selengkapnya",
// atau halaman "Lihat Semua" kalau dibuka dari situ) lewat browser history, bukan
// hardcode ke satu tujuan tetap. Fallback ke beranda SIP kalau tidak ada history
// (mis. halaman dibuka langsung lewat link luar).
export function BackButton({ label = "Kembali" }: { label?: string }) {
  const router = useRouter();

  function handleClick() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/sip");
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-sip-primary-800/70 transition-colors hover:text-sip-primary-900"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M11 18l-6-6 6-6" />
      </svg>
      {label}
    </button>
  );
}
