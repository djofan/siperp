"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin/sarsip", label: "Dashboard" },
  { href: "/admin/sarsip/kegiatan", label: "Kegiatan" },
  { href: "/admin/sarsip/berita", label: "Berita" },
  { href: "/admin/sarsip/campaign", label: "Campaign" },
  { href: "/admin/sarsip/transaksi", label: "Transaksi" },
  { href: "/admin/sarsip/beneficiary", label: "Penerima Manfaat" },
  { href: "/admin/sarsip/donatur", label: "Donatur" },
  { href: "/admin/sarsip/profil", label: "Profil Tim" },
];

function getActiveHref(pathname: string): string | null {
  const matches = NAV_ITEMS.map((item) => item.href).filter(
    (href) => pathname === href || pathname.startsWith(`${href}/`)
  );
  if (matches.length === 0) return null;
  return matches.reduce((longest, href) => (href.length > longest.length ? href : longest));
}

export function SarsipSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const activeHref = getActiveHref(pathname);

  return (
    <div className="flex h-full w-64 shrink-0 flex-col bg-white dark:bg-transparent">
      <div className="flex h-20 shrink-0 items-center gap-2.5 border-b border-lazsip-primary-100 px-6 dark:border-white/10">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lazsip-primary-900 text-xs font-bold text-white dark:bg-lazsip-primary-500">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4.5 w-4.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 0 0-9 9h3a6 6 0 0 1 12 0h3a9 9 0 0 0-9-9zM12 21v-6M8 21h8" />
          </svg>
        </span>
        <span className="text-base font-extrabold tracking-tight text-lazsip-primary-900 dark:text-white">
          SARSIP Admin
        </span>
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
                  ? "bg-lazsip-primary-900 text-white dark:bg-lazsip-primary-500"
                  : "text-lazsip-primary-800/70 hover:bg-lazsip-primary-50 dark:text-white/60 dark:hover:bg-white/10"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-lazsip-primary-100 p-4 dark:border-white/10">
        <Link
          href="/sarsip"
          onClick={onNavigate}
          className="mb-1 flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-lazsip-primary-800/60 transition-colors hover:bg-lazsip-primary-50 dark:text-white/50 dark:hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4.5 w-4.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
          </svg>
          Lihat Situs Publik
        </Link>
        <Link
          href="/admin"
          onClick={onNavigate}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-lazsip-primary-800/60 transition-colors hover:bg-lazsip-primary-50 dark:text-white/50 dark:hover:bg-white/10"
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
