"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { LAZSIP_NAV_ITEMS } from "@/modules/lazsip/components/admin/LazsipSidebar";

export function LazsipTopbar({
  onMenuClick,
  pendingTransactionsCount = 0,
}: {
  onMenuClick?: () => void;
  pendingTransactionsCount?: number;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");

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

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 px-4 sm:px-6 lg:px-8">
      {onMenuClick && (
        <button
          type="button"
          aria-label="Buka menu"
          onClick={onMenuClick}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white hover:bg-white/10 lg:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      )}

      <form onSubmit={handleSearch} className="hidden max-w-xs flex-1 items-center gap-2 rounded-full bg-white/5 px-4 py-2 lg:flex">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0 text-white/40">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari menu, mis. donasi, zakat..."
          className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/40"
        />
      </form>

      <div className="ml-auto flex min-w-0 items-center gap-2">
        <Link
          href="/admin"
          aria-label="Pilihan Modul"
          title="Pilihan Modul"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </Link>
        <Link
          href="/admin/lazsip/transaksi"
          aria-label="Transaksi menunggu verifikasi"
          className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10"
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
      </div>
    </header>
  );
}
