"use client";

import { useEffect, useState } from "react";
import { SipSidebar } from "@/modules/sip/components/admin/SipSidebar";
import { SipTopbar } from "@/modules/sip/components/admin/SipTopbar";
import { AdminGradientBackground } from "@/components/admin-shell/AdminGradientBackground";

const MOBILE_SIDEBAR_TRANSITION_MS = 200;

export function SipAdminShellChrome({
  userName,
  children,
}: {
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
    <div className="dark relative flex h-dvh overflow-hidden text-foreground">
      <AdminGradientBackground glow="183,230,62" placement="bottom" />
      <div className="relative z-10 hidden shrink-0 lg:block">
        <SipSidebar userName={userName} />
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
            <SipSidebar userName={userName} onNavigate={closeMobileSidebar} />
          </div>
        </div>
      )}

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <SipTopbar onMenuClick={() => setMobileOpen(true)} />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
