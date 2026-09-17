"use client";

import { useState } from "react";
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

export function Sidebar({ groups, onNavigate }: { groups: NavGroup[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const activeHref = getActiveHref(groups, pathname);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  return (
    <nav className="flex h-full w-64 shrink-0 flex-col gap-6 bg-surface px-4 py-6 shadow-[1px_0_3px_rgba(0,0,0,0.05)]">
      <span className="px-2 text-lg font-bold text-foreground">SIP Admin</span>
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
                  className="flex items-center justify-between px-2 py-0.5 text-xs font-semibold tracking-wide text-foreground/40 uppercase"
                >
                  {group.heading}
                  <ChevronDownIcon className={cn("h-3.5 w-3.5 transition-transform", !isOpen && "-rotate-90")} />
                </button>
              ) : (
                <span className="px-2 text-xs font-semibold tracking-wide text-foreground/40 uppercase">
                  {group.heading}
                </span>
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
        );
      })}
    </nav>
  );
}
