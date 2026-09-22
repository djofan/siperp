"use client";

import { useState } from "react";
import { SarsipSidebar } from "@/modules/sarsip/components/admin/SarsipSidebar";
import { SarsipTopbar } from "@/modules/sarsip/components/admin/SarsipTopbar";
import { useTheme } from "@/lib/useTheme";
import { cn } from "@/lib/utils";

export function SarsipAdminShellChrome({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={cn("flex h-screen overflow-hidden bg-white dark:bg-[#0b0e0c]", theme === "dark" && "dark")}>
      <div className="hidden shrink-0 shadow-[1px_0_3px_rgba(0,0,0,0.05)] lg:block dark:border-r dark:border-white/10">
        <SarsipSidebar />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-lazsip-primary-900/40" onClick={() => setMobileOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 shadow-xl">
            <SarsipSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <SarsipTopbar userName={userName} onMenuClick={() => setMobileOpen(true)} theme={theme} onToggleTheme={toggleTheme} />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
