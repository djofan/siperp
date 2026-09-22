"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { LAZSIP_NAV_ITEMS } from "@/modules/lazsip/components/admin/LazsipSidebar";
import type { Theme } from "@/lib/useTheme";

export function LazsipTopbar({
  userName,
  onMenuClick,
  theme,
  onToggleTheme,
  pendingTransactionsCount = 0,
}: {
  userName: string;
  onMenuClick?: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  pendingTransactionsCount?: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const q = query.trim().toLowerCase();
    if (!q) return;
    const match = LAZSIP_NAV_ITEMS.find((item) => item.label.toLowerCase().includes(q));
    if (match) {
      router.push(match.href);
      setQuery("");
    }
  }

  const firstName = userName.split(" ")[0] || userName;
  const initials = userName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="flex h-20 shrink-0 items-center gap-3 bg-white px-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] sm:px-6 lg:px-8 dark:border-b dark:border-white/10 dark:bg-transparent">
      {onMenuClick && (
        <button
          type="button"
          aria-label="Buka menu"
          onClick={onMenuClick}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lazsip-primary-900 hover:bg-lazsip-primary-50 lg:hidden dark:text-white dark:hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      )}

      <div className="hidden min-w-0 flex-col lg:flex">
        <span className="truncate text-sm font-semibold text-lazsip-primary-900 dark:text-white">Selamat datang, {firstName}</span>
        <span className="text-xs text-lazsip-primary-800/50 dark:text-white/40">Semoga harimu berkah.</span>
      </div>

      <form onSubmit={handleSearch} className="ml-2 hidden max-w-xs flex-1 items-center gap-2 rounded-full bg-lazsip-primary-50/70 px-4 py-2 lg:flex dark:bg-white/10">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0 text-lazsip-primary-800/40 dark:text-white/40">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari menu, mis. donasi, zakat..."
          className="w-full bg-transparent text-sm text-lazsip-primary-900 outline-none placeholder:text-lazsip-primary-800/40 dark:text-white dark:placeholder:text-white/40"
        />
      </form>

      <div className="ml-auto flex min-w-0 items-center gap-3">
        <Link
          href="/admin/lazsip/transaksi"
          aria-label="Transaksi menunggu verifikasi"
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lazsip-primary-800/70 transition-colors hover:bg-lazsip-primary-50 dark:text-white/60 dark:hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" />
          </svg>
          {pendingTransactionsCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {pendingTransactionsCount > 99 ? "99+" : pendingTransactionsCount}
            </span>
          )}
        </Link>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lazsip-primary-50 text-xs font-bold text-lazsip-primary-800 dark:bg-white/10 dark:text-white">
          {initials || "AD"}
        </span>
        <span className="hidden truncate text-sm font-medium text-lazsip-primary-800/70 sm:inline dark:text-white/70">
          {userName}
        </span>
        <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        <button
          type="button"
          onClick={handleLogout}
          className="shrink-0 rounded-xl border border-lazsip-primary-200 px-3 py-1.5 text-sm font-medium text-lazsip-primary-800 transition-colors hover:border-lazsip-primary-400 dark:border-white/15 dark:text-white dark:hover:border-white/30"
        >
          Keluar
        </button>
      </div>
    </header>
  );
}
