"use client";

import { useState } from "react";
import { MobileSidebar } from "@/components/admin-shell/MobileSidebar";
import { SipSidebar } from "@/modules/sip/components/admin/SipSidebar";
import { SipTopbar } from "@/modules/sip/components/admin/SipTopbar";
import { AdminGradientBackground } from "@/components/admin-shell/AdminGradientBackground";


export function SipAdminShellChrome({
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
      <AdminGradientBackground glow="183,230,62" placement="bottom" />
      <div className="relative z-10 hidden shrink-0 lg:block">
        <SipSidebar userName={userName} />
      </div>

      <MobileSidebar open={mobileOpen} onClose={closeMobileSidebar}>
        <SipSidebar userName={userName} onNavigate={closeMobileSidebar} />
      </MobileSidebar>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <SipTopbar onMenuClick={() => setMobileOpen(true)} />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
