"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

function LogoutIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export function SarsipSidebar({ userName, onNavigate }: { userName: string; onNavigate?: () => void }) {
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
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-xs font-bold text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4.5 w-4.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3a9 9 0 0 0-9 9h3a6 6 0 0 1 12 0h3a9 9 0 0 0-9-9zM12 21v-6M8 21h8" />
          </svg>
        </span>
        <span className="text-base font-extrabold tracking-tight text-white">SARSIP Admin</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "relative rounded-full px-3.5 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white/10 pl-5 text-white before:absolute before:top-1/2 before:left-1.5 before:h-4 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-emerald-500"
                  : "text-white/55 hover:bg-white/5 hover:text-white"
              )}
            >
              {item.label}
            </Link>
          );
        })}

        <div className="mt-2 flex flex-col gap-1">
          <Link
            href="/sarsip"
            onClick={onNavigate}
            className="flex w-full items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-medium text-white/50 transition-colors hover:bg-white/5 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4.5 w-4.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" />
            </svg>
            Lihat Situs Publik
          </Link>
          <Link
            href="/admin"
            onClick={onNavigate}
            className="flex w-full items-center gap-3 rounded-full px-3.5 py-2.5 text-sm font-medium text-white/50 transition-colors hover:bg-white/5 hover:text-white"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4.5 w-4.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Pilihan Modul
          </Link>
        </div>
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
