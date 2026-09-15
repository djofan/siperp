"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface NavItem {
  href: string;
  label: string;
}

export interface NavGroup {
  heading?: string;
  items: NavItem[];
}

function getActiveHref(groups: NavGroup[], pathname: string): string | null {
  const hrefs = groups.flatMap((group) => group.items.map((item) => item.href));
  const matches = hrefs.filter(
    (href) => pathname === href || pathname.startsWith(`${href}/`)
  );
  if (matches.length === 0) return null;
  return matches.reduce((longest, href) => (href.length > longest.length ? href : longest));
}

export function Sidebar({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const activeHref = getActiveHref(groups, pathname);

  return (
    <nav className="flex h-full w-64 shrink-0 flex-col gap-6 overflow-y-auto bg-surface px-4 py-6">
      <span className="px-2 text-lg font-bold text-foreground">SIP Admin</span>
      {groups.map((group, index) => (
        <div key={group.heading ?? index} className="flex flex-col gap-1">
          {group.heading && (
            <span className="px-2 text-xs font-semibold uppercase tracking-wide text-foreground/40">
              {group.heading}
            </span>
          )}
          {group.items.map((item) => {
            const isActive = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-accent-soft text-accent"
                    : "text-foreground/70 hover:bg-surface-muted hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
