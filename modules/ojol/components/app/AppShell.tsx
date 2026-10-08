"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Icon, type IconName } from "@/modules/ojol/components/icons";
import { Avatar } from "@/modules/ojol/components/ui";
import { Wordmark } from "@/modules/ojol/components/Wordmark";

export interface AppNavItem {
  href: string;
  label: string;
  icon: IconName;
  badge?: number;
}

function isActive(pathname: string, href: string, root: string) {
  return href === root ? pathname === root : pathname === href || pathname.startsWith(href + "/");
}

export function AppShell({
  root,
  roleLabel,
  nav,
  user,
  children,
}: {
  root: string;
  roleLabel: string;
  nav: AppNavItem[];
  user: { name: string; code: string; photo: string | null };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function logout() {
    setLeaving(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.replace("/ojol/masuk");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-ojol-paper text-ojol-ink">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-ojol-surface px-4 py-6 ring-1 ring-ojol-line lg:flex">
        <div className="px-2">
          <Wordmark href={root} />
          <p className="mt-2 text-xs text-ojol-muted">{roleLabel}</p>
        </div>
        <nav aria-label="Menu utama" className="mt-8 flex flex-1 flex-col gap-1">
          {nav.map((item) => {
            const active = isActive(pathname, item.href, root);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  active ? "bg-ojol-primary-soft font-medium text-ojol-primary" : "text-ojol-muted hover:bg-ojol-paper hover:text-ojol-ink",
                )}
              >
                <Icon name={item.icon} />
                <span className="flex-1">{item.label}</span>
                {!!item.badge && (
                  <span className="min-w-5 rounded-full bg-ojol-primary px-1.5 py-0.5 text-center text-[11px] font-semibold text-white tabular-nums">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">
          <Avatar name={user.name} src={user.photo} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="text-xs text-ojol-muted tabular-nums">{user.code}</p>
          </div>
          <button
            type="button"
            onClick={logout}
            disabled={leaving}
            aria-label="Keluar"
            title="Keluar"
            className="rounded-lg p-2 text-ojol-muted transition-colors hover:bg-ojol-paper hover:text-ojol-ink"
          >
            <Icon name="logout" className="h-[18px] w-[18px]" />
          </button>
        </div>
      </aside>

      {/* Header HP */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-ojol-paper/95 px-4 backdrop-blur lg:hidden">
        <Wordmark href={root} />
        <button
          type="button"
          onClick={logout}
          disabled={leaving}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-ojol-muted hover:bg-ojol-surface"
        >
          <Icon name="logout" className="h-4 w-4" />
          Keluar
        </button>
      </header>

      <main className="px-4 pb-28 pt-4 sm:px-6 lg:ml-64 lg:px-10 lg:pb-16 lg:pt-10">
        <div className="mx-auto w-full max-w-5xl">{children}</div>
      </main>

      {/* Tab bar HP */}
      <nav
        aria-label="Menu utama"
        className="fixed inset-x-0 bottom-0 z-30 grid bg-ojol-surface pb-[env(safe-area-inset-bottom)] ring-1 ring-ojol-line lg:hidden"
        style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}
      >
        {nav.map((item) => {
          const active = isActive(pathname, item.href, root);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn("relative flex flex-col items-center gap-1 py-2.5 text-[11px]", active ? "font-medium text-ojol-primary" : "text-ojol-muted")}
            >
              <Icon name={item.icon} className="h-[22px] w-[22px]" />
              {item.label}
              {!!item.badge && (
                <span className="absolute left-1/2 top-1.5 ml-2 min-w-4 rounded-full bg-ojol-primary px-1 text-center text-[10px] font-semibold leading-4 text-white tabular-nums">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
