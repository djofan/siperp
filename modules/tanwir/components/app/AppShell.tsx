"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Icon, type IconName } from "@/modules/tanwir/components/icons";
import { Avatar } from "@/modules/tanwir/components/ui";
import { Wordmark } from "@/modules/tanwir/components/Wordmark";

export interface AppNavItem { href: string; label: string; icon: IconName; badge?: number }

export function AppShell({ root, roleLabel, nav, user, children, logoutHref = "/tanwir/masuk" }: {
  root: string; roleLabel: string; nav: AppNavItem[];
  user: { name: string; code: string; photo: string | null };
  children: React.ReactNode; logoutHref?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const active = (href: string) => href === root || href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
  const current = nav.find(item => active(item.href));
  async function logout() {
    setLeaving(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.replace(logoutHref);
    router.refresh();
  }
  return (
    <div className="learning-shell">
      <a href="#tanwir-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:p-3">Lewati ke konten</a>
      <aside className="learning-sidebar fixed inset-y-0 left-0 z-30 hidden w-64 flex-col px-4 py-4 lg:flex">
        <div className="px-3">
          <Wordmark href={root} inverted={false} />
          <p className="mt-2 text-[11px] text-tanwir-muted">{roleLabel.split(" · ")[0]} · Tanwir Qurani</p>
        </div>
        <div className="mx-3 mt-9 flex items-center gap-2 border-t border-current/10 pt-5 text-[10px] font-semibold uppercase tracking-[.18em] opacity-65">
          {roleLabel}
        </div>
        <nav aria-label="Menu utama" className="mt-4 flex-1 space-y-1 overflow-y-auto">
          {nav.map(item => <Link key={item.href} href={item.href} className="learning-nav-item" aria-current={active(item.href) ? "page" : undefined}>
            <Icon name={item.icon} className="h-[19px] w-[19px] shrink-0" /><span className="flex-1">{item.label}</span>
            {!!item.badge && <span className="rounded-full bg-tanwir-primary-soft px-2 py-0.5 text-[10px] text-tanwir-primary">{item.badge}</span>}
          </Link>)}
        </nav>
        <div className="flex items-center gap-3 border-t border-current/10 px-2 pt-5">
          <Avatar name={user.name} src={user.photo} size={36} />
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{user.name}</p><p className="mt-1 text-[10px] opacity-55">{user.code}</p></div>
          <button type="button" onClick={logout} disabled={leaving} aria-label="Keluar" title="Keluar" className="rounded-lg p-2 hover:bg-current/10 disabled:opacity-50"><Icon name="logout" className="h-4 w-4" /></button>
        </div>
      </aside>
      <div className="lg:ml-64">
        <header className="learning-bar flex min-h-20 items-center justify-between gap-4 px-4 sm:px-8">
          <div><div className="lg:hidden"><Wordmark href={root} /></div><p className="hidden text-xs text-tanwir-muted lg:block">Tanwir Qurani / {roleLabel.split(" · ")[0]} / <span className="text-tanwir-ink">{current?.label ?? "Beranda"}</span></p></div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-3 sm:flex"><Avatar name={user.name} src={user.photo} size={36} /><div><p className="text-xs font-medium">{user.name}</p><p className="text-xs text-tanwir-muted">{user.code} · {roleLabel.split(" · ")[0]}</p></div></div>
            <button type="button" onClick={logout} disabled={leaving} className="flex items-center gap-2 rounded-full px-3 py-2 text-xs text-tanwir-muted hover:bg-tanwir-primary-soft disabled:opacity-50"><Icon name="logout" className="h-4 w-4" />Keluar</button>
          </div>
        </header>
        <main id="tanwir-content" className="learning-content px-4 pb-32 pt-7 sm:px-8 lg:pb-12 lg:pt-9">{children}</main>
      </div>
      <nav aria-label="Menu utama seluler" className="mobile-tabs fixed inset-x-0 bottom-0 z-30 flex overflow-x-auto pb-[env(safe-area-inset-bottom)] lg:hidden">
        {nav.map(item => <Link key={item.href} href={item.href} aria-current={active(item.href) ? "page" : undefined} className={`relative flex min-w-[72px] flex-1 flex-col items-center gap-1.5 px-2 py-3 text-[10px] ${active(item.href) ? "font-semibold text-tanwir-primary" : "text-tanwir-muted"}`}>
          <Icon name={item.icon} className="h-5 w-5" />{item.label}
          {!!item.badge && <span className="absolute right-2 top-1 rounded-full bg-tanwir-primary-soft px-1.5 text-[9px] text-tanwir-primary">{item.badge}</span>}
        </Link>)}
      </nav>
    </div>
  );
}
