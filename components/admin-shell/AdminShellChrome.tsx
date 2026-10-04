"use client";

import { useEffect, useState } from "react";
import { Sidebar, type NavGroup } from "@/components/admin-shell/Sidebar";
import { Topbar } from "@/components/admin-shell/Topbar";
import { AdminGradientBackground } from "@/components/admin-shell/AdminGradientBackground";

const MOBILE_SIDEBAR_TRANSITION_MS = 200;

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
  const [mobileVisible, setMobileVisible] = useState(false);

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
    <div className="dark relative flex h-screen overflow-hidden">
      <AdminGradientBackground glow="116,175,39" placement="top" />
      <div className="relative z-10 hidden shrink-0 lg:block">
        <Sidebar groups={groups} userName={userName} />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className={`absolute inset-0 bg-black/50 transition-opacity duration-200 ${mobileVisible ? "opacity-100" : "opacity-0"}`}
            onClick={closeMobileSidebar}
            aria-hidden
          />
          <div
            className={`absolute inset-y-0 left-0 bg-[#0a0d08] shadow-xl transition-transform duration-200 ease-out ${mobileVisible ? "translate-x-0" : "-translate-x-full"}`}
          >
            <Sidebar groups={groups} userName={userName} onNavigate={closeMobileSidebar} />
          </div>
        </div>
      )}

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setMobileOpen(true)} />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
