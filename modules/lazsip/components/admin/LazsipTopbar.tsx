"use client";

import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { Theme } from "@/lib/useTheme";

export function LazsipTopbar({
  userName,
  onMenuClick,
  theme,
  onToggleTheme,
}: {
  userName: string;
  onMenuClick?: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}) {
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
    <header className="flex h-20 shrink-0 items-center gap-3 bg-white px-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] sm:px-6 lg:px-8 dark:bg-transparent">
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

      <div className="ml-auto flex min-w-0 items-center gap-3">
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
