"use client";

import Link from "next/link";
import { LayoutDashboard, Megaphone, Newspaper, ReceiptText, UsersRound, HeartHandshake, Settings2 } from "lucide-react";
import styles from "./Admin.module.css";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { SarsipMark } from "@/modules/sarsip/components/SarsipMark";

const NAV_ITEMS = [
  { href: "/admin/sarsip", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/sarsip/berita", label: "Berita", icon: Newspaper },
  { href: "/admin/sarsip/campaign", label: "Campaign", icon: Megaphone },
  { href: "/admin/sarsip/transaksi", label: "Transaksi", icon: ReceiptText },
  { href: "/admin/sarsip/beneficiary", label: "Bantuan", icon: HeartHandshake },
  { href: "/admin/sarsip/donatur", label: "Donatur", icon: UsersRound },
  { href: "/admin/sarsip/profil", label: "Profil Tim", icon: Settings2 },
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
    <div className={`${styles.sidebar} flex h-full w-64 shrink-0 flex-col py-2`}>
      <div className="flex h-18 shrink-0 items-center gap-2.5 px-6">
        <SarsipMark className="h-11 w-11" />
        <div><span className="text-base font-extrabold tracking-tight text-white">SARSIP Admin</span><p className={styles.brandTag}>Pusat pengelolaan</p></div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4"><p className={styles.navLabel}>Ruang kerja</p>
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(styles.navItem,isActive&&styles.navActive)}
              aria-current={isActive?"page":undefined}
            >
              <item.icon aria-hidden="true"/>{item.label}
            </Link>
          );
        })}

        <div className="mt-2 flex flex-col gap-1">
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
