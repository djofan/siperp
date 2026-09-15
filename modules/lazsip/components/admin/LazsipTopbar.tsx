"use client";

import { useRouter } from "next/navigation";

export function LazsipTopbar({ userName, onMenuClick }: { userName: string; onMenuClick?: () => void }) {
  const router = useRouter();

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
    <header className="flex h-20 shrink-0 items-center gap-3 border-b border-lazsip-primary-100 bg-white px-4 sm:px-6 lg:px-8">
      {onMenuClick && (
        <button
          type="button"
          aria-label="Buka menu"
          onClick={onMenuClick}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lazsip-primary-900 hover:bg-lazsip-primary-50 lg:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      )}

      <div className="ml-auto flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lazsip-primary-50 text-xs font-bold text-lazsip-primary-800">
          {initials || "AD"}
        </span>
        <span className="hidden truncate text-sm font-medium text-lazsip-primary-800/70 sm:inline">{userName}</span>
        <button
          type="button"
          onClick={handleLogout}
          className="shrink-0 rounded-xl border border-lazsip-primary-200 px-3 py-1.5 text-sm font-medium text-lazsip-primary-800 transition-colors hover:border-lazsip-primary-400"
        >
          Keluar
        </button>
      </div>
    </header>
  );
}
