"use client";

import { useState } from "react";
import { MobileSidebar } from "@/components/admin-shell/MobileSidebar";
import { SarsipSidebar } from "@/modules/sarsip/components/admin/SarsipSidebar";
import { SarsipTopbar } from "@/modules/sarsip/components/admin/SarsipTopbar";
import { AdminGradientBackground } from "@/components/admin-shell/AdminGradientBackground";


export function SarsipAdminShellChrome({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  function closeMobileSidebar() { setMobileOpen(false); }

  return (
    <div className="dark relative flex h-dvh overflow-hidden text-foreground">
      <AdminGradientBackground glow="16,185,129" />
      <div className="relative z-10 hidden shrink-0 lg:block">
        <SarsipSidebar userName={userName} />
      </div>

      <MobileSidebar open={mobileOpen} onClose={closeMobileSidebar}>
        <SarsipSidebar userName={userName} onNavigate={closeMobileSidebar} />
      </MobileSidebar>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <SarsipTopbar onMenuClick={() => setMobileOpen(true)} />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
