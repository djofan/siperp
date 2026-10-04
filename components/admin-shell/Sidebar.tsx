"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
}

export interface NavGroup {
  heading?: string;
  items: NavItem[];
  collapsible?: boolean;
}

function getActiveHref(groups: NavGroup[], pathname: string): string | null {
  const hrefs = groups.flatMap((group) => group.items.map((item) => item.href));
  const matches = hrefs.filter(
    (href) => pathname === href || pathname.startsWith(`${href}/`)
  );
  if (matches.length === 0) return null;
  return matches.reduce((longest, href) => (href.length > longest.length ? href : longest));
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function LogoutIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export function Sidebar({
  groups,
  userName,
  onNavigate,
}: {
  groups: NavGroup[];
  userName: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const activeHref = getActiveHref(groups, pathname);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

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
    <nav className="flex h-full w-64 shrink-0 flex-col gap-6 px-4 py-6">
      <div className="flex flex-col px-3">
        <span className="text-lg font-bold text-white">SIP Admin</span>
        <span className="text-[11px] font-medium tracking-[0.14em] text-white/35 uppercase">Core Panel</span>
      </div>

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto">
        {groups.map((group, index) => {
          const key = group.heading ?? String(index);
          const isOpen = !collapsed[key];

          return (
            <div key={key} className="flex flex-col gap-1">
              {group.heading &&
                (group.collapsible ? (
                  <button
                    type="button"
                    onClick={() => setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }))}
                    className="flex items-center justify-between px-3 py-0.5 text-xs font-semibold tracking-wide text-white/35 uppercase"
                  >
                    {group.heading}
                    <ChevronDownIcon className={cn("h-3.5 w-3.5 transition-transform", !isOpen && "-rotate-90")} />
                  </button>
                ) : (
                  <span className="px-3 text-xs font-semibold tracking-wide text-white/35 uppercase">{group.heading}</span>
                ))}
              {isOpen &&
                group.items.map((item) => {
                  const isActive = item.href === activeHref;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-white/10 text-white after:h-1.5 after:w-1.5 after:rounded-full after:bg-accent"
                          : "text-white/55 hover:bg-white/[0.04] hover:text-white"
                      )}
                    >
                      {item.label}
                    </Link>
                  );
                })}
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-3 px-1">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-xs font-bold text-white">
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
    </nav>
  );
}
