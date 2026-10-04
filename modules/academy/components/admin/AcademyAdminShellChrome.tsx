"use client";

import { useEffect, useState } from "react";
import { AcademySidebar, type AcademyNavGroup } from "@/modules/academy/components/admin/AcademySidebar";
import { AcademyTopbar } from "@/modules/academy/components/admin/AcademyTopbar";
import { useAcademyTheme } from "@/modules/academy/components/admin/useAcademyTheme";
import { cn } from "@/lib/utils";

const MOBILE_SIDEBAR_TRANSITION_MS = 200;

export function AcademyAdminShellChrome({
  groups,
  userName,
  children,
}: {
  groups: AcademyNavGroup[];
  userName: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileVisible, setMobileVisible] = useState(false);
  const { theme, toggleTheme } = useAcademyTheme();

  useEffect(() => {
    if (!mobileOpen) return;
    const raf = requestAnimationFrame(() => setMobileVisible(true));
    return () => cancelAnimationFrame(raf);
  }, [mobileOpen]);

  function closeMobileSidebar() {
    setMobileVisible(false);
    setTimeout(() => setMobileOpen(false), MOBILE_SIDEBAR_TRANSITION_MS);
  }

  return (
    <div className={cn("flex h-screen overflow-hidden bg-surface-muted", theme === "dark" && "dark")}>
      <div className="hidden shrink-0 lg:block">
        <AcademySidebar groups={groups} />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${mobileVisible ? "opacity-100" : "opacity-0"}`}
            onClick={closeMobileSidebar}
            aria-hidden
          />
          <div
            className={`absolute inset-y-0 left-0 shadow-xl transition-transform duration-200 ease-out ${mobileVisible ? "translate-x-0" : "-translate-x-full"}`}
          >
            <AcademySidebar groups={groups} onNavigate={closeMobileSidebar} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AcademyTopbar userName={userName} onMenuClick={() => setMobileOpen(true)} theme={theme} onToggleTheme={toggleTheme} />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
