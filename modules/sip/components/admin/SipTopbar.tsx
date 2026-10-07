"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SipTopbar({ onMenuClick }: { onMenuClick?: () => void }) {
  const section = usePathname().split("/")[3];
  const title: Record<string, string> = { konten: "Konten Umum", "program-bantuan": "Program Bantuan", "penyaluran-bantuan": "Penyaluran Bantuan", berita: "Berita", laporan: "Laporan" };
  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-white/5 px-4 sm:px-6 lg:px-8">
      {onMenuClick && (
        <button
          type="button"
          aria-label="Buka menu"
          onClick={onMenuClick}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white hover:bg-white/10 lg:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      )}
      <p className="min-w-0 flex-1 truncate text-sm text-white/60">SIP / <span className="font-medium text-white">{title[section] ?? "Dashboard"}</span></p>
      <Link href="/" target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs font-semibold text-sip-lime hover:text-white">Lihat website ↗</Link>
    </header>
  );
}
