"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LazsipMark } from "@/modules/lazsip/components/LazsipMark";

const NAV_ITEMS = [
  { href: "/admin/lazsip", label: "Dashboard" },
  { href: "/admin/lazsip/donasi", label: "Donasi / Campaign" },
  { href: "/admin/lazsip/transaksi", label: "Transaksi Donasi" },
  { href: "/admin/lazsip/zakat", label: "Transaksi Zakat" },
  { href: "/admin/lazsip/donatur", label: "Semua Donatur" },
  { href: "/admin/lazsip/donatur-infaq", label: "Donatur Infaq" },
  { href: "/admin/lazsip/donatur-zakat", label: "Donatur Zakat" },
  { href: "/admin/lazsip/biaya-payment", label: "Biaya Payment" },
  { href: "/admin/lazsip/program", label: "Program Pemberdayaan" },
  { href: "/admin/lazsip/kegiatan", label: "Kegiatan" },
  { href: "/admin/lazsip/pendaftar", label: "Pendaftar" },
  { href: "/admin/lazsip/penyaluran-bantuan", label: "Penyaluran Bantuan" },
  { href: "/admin/lazsip/berita", label: "Berita" },
  { href: "/admin/lazsip/mitra", label: "Mitra" },
  { href: "/admin/lazsip/konten", label: "Konten Umum" },
];

function getActiveHref(pathname: string): string | null {
  const matches = NAV_ITEMS.map((item) => item.href).filter(
    (href) => pathname === href || pathname.startsWith(`${href}/`)
  );
  if (matches.length === 0) return null;
  return matches.reduce((longest, href) => (href.length > longest.length ? href : longest));
}

export function LazsipSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const activeHref = getActiveHref(pathname);

  return (
    <div className="flex h-full w-64 shrink-0 flex-col bg-white dark:bg-transparent">
      <div className="flex h-20 shrink-0 items-center gap-2.5 border-b border-lazsip-primary-100 px-6 dark:border-white/10">
        <LazsipMark />
        <span className="text-base font-extrabold tracking-tight text-lazsip-primary-900 dark:text-white">
          LAZSIP Admin
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
