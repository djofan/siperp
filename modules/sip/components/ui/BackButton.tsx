"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";

// Dinamis: balik ke halaman asal (landing page kalau dibuka dari "Baca Selengkapnya",
// atau halaman "Lihat Semua" kalau dibuka dari situ) lewat browser history, bukan
// hardcode ke satu tujuan tetap. Fallback ke beranda SIP kalau tidak ada history
// (mis. halaman dibuka langsung lewat link luar).
export function BackButton({ label = "Kembali", href }: { label?: string; href?: string }) {
  const router = useRouter();

  function handleClick() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }

  const className = "group inline-flex min-h-11 max-w-full items-center gap-2.5 rounded-full bg-sip-primary-50 px-4 py-2.5 text-sm font-semibold text-sip-primary-900 transition-colors hover:bg-sip-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sip-primary-500 focus-visible:ring-offset-2";
  const content = <>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5 motion-reduce:transform-none">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5M11 18l-6-6 6-6" />
      </svg>
      {label}
    </>;
  return href
    ? <Link href={href} className={className}>{content}</Link>
    : <button type="button" onClick={handleClick} className={className}>{content}</button>;
}
