"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { LazsipMark } from "@/modules/lazsip/components/LazsipMark";

export const LAZSIP_NAV_ITEMS = [
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
  const matches = LAZSIP_NAV_ITEMS.map((item) => item.href).filter(
    (href) => pathname === href || pathname.startsWith(`${href}/`)
  );
  if (matches.length === 0) return null;
  return matches.reduce((longest, href) => (href.length > longest.length ? href : longest));
}

function LogoutIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export function LazsipSidebar({ userName, onNavigate }: { userName: string; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const activeHref = getActiveHref(pathname);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-full w-64 shrink-0 flex-col py-2">
      <div className="flex h-18 shrink-0 items-center gap-2.5 px-6">
        <LazsipMark />
        <span className="text-base font-extrabold tracking-tight text-white">LAZSIP Admin</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
        {LAZSIP_NAV_ITEMS.map((item) => {
          const isActive = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "relative rounded-full px-3.5 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/10 pl-5 text-white before:absolute before:top-1/2 before:left-1.5 before:h-4 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-lazsip-primary-500"
                  : "text-white/55 hover:bg-white/5 hover:text-white"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-3 px-5 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white">
          {initials || "AD"}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-white">{userName}</span>
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Keluar"
          title="Keluar"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
        >
          <LogoutIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
