"use client";

import { useState } from "react";
import { Sidebar, type NavGroup } from "@/components/admin-shell/Sidebar";
import { Topbar } from "@/components/admin-shell/Topbar";

export function AdminShellChrome({
  groups,
  userName,
  children,
}: {
  groups: NavGroup[];
  userName: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <div className="hidden shrink-0 border-r border-border lg:block">
        <Sidebar groups={groups} />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/40" onClick={() => setMobileOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 shadow-xl">
            <Sidebar groups={groups} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar userName={userName} onMenuClick={() => setMobileOpen(true)} />
        <main className="min-w-0 flex-1 overflow-x-hidden bg-surface-muted p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
