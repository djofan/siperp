"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { SipMark } from "@/modules/sip/components/SipMark";

const NAV_ITEMS = [
  { href: "/admin/sip", label: "Dashboard" },
  { href: "/admin/sip/konten", label: "Konten Umum" },
  { href: "/admin/sip/program-bantuan", label: "Program Bantuan" },
  { href: "/admin/sip/penyaluran-bantuan", label: "Penyaluran Bantuan" },
  { href: "/admin/sip/berita", label: "Berita" },
  { href: "/admin/sip/laporan", label: "Laporan" },
];

function getActiveHref(pathname: string): string | null {
  const matches = NAV_ITEMS.map((item) => item.href).filter(
    (href) => pathname === href || pathname.startsWith(`${href}/`)
  );
  if (matches.length === 0) return null;
  return matches.reduce((longest, href) => (href.length > longest.length ? href : longest));
}

export function SipSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const activeHref = getActiveHref(pathname);

  return (
    <div className="flex h-full w-64 shrink-0 flex-col bg-white dark:bg-transparent">
      <div className="flex h-20 shrink-0 items-center gap-2.5 border-b border-sip-primary-100 px-6 dark:border-white/10">
        <SipMark />
        <span className="text-base font-extrabold tracking-tight text-sip-primary-900 dark:text-white">SIP Admin</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-4">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sip-primary-900 text-white dark:bg-sip-primary-500"
                  : "text-sip-primary-800/70 hover:bg-sip-primary-50 dark:text-white/60 dark:hover:bg-white/10"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sip-primary-100 p-4 dark:border-white/10">
        <Link
          href="/admin"
          onClick={onNavigate}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-sip-primary-800/60 transition-colors hover:bg-sip-primary-50 dark:text-white/50 dark:hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4.5 w-4.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
          Pilihan Modul
        </Link>
      </div>
    </div>
  );
}
