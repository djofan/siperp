"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import type { Theme } from "@/lib/useTheme";

export function Topbar({
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

  return (
    <header className="flex h-16 items-center gap-3 bg-surface px-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] sm:px-6">
      {onMenuClick && (
        <button
          type="button"
          aria-label="Buka menu"
          onClick={onMenuClick}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground hover:bg-surface-muted lg:hidden"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      )}
      <span className="min-w-0 flex-1 truncate text-sm text-foreground/60">Halo, {userName}</span>
      <ThemeToggle theme={theme} onToggle={onToggleTheme} />
      <Button variant="secondary" size="sm" onClick={handleLogout}>
        Keluar
      </Button>
    </header>
  );
}
