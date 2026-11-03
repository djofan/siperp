"use client";

import { useState } from "react";
import { MobileSidebar } from "@/components/admin-shell/MobileSidebar";
import { LazsipSidebar } from "@/modules/lazsip/components/admin/LazsipSidebar";
import { LazsipTopbar } from "@/modules/lazsip/components/admin/LazsipTopbar";
import { AdminGradientBackground } from "@/components/admin-shell/AdminGradientBackground";
import styles from "./LazsipAdminShellChrome.module.css";


export function LazsipAdminShellChrome({
  userName,
  pendingTransactionsCount,
  children,
}: {
  userName: string;
  pendingTransactionsCount?: number;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  function closeMobileSidebar() { setMobileOpen(false); }

  return (
    <div className={`${styles.chrome} dark relative flex h-dvh overflow-hidden text-foreground`}>
      <AdminGradientBackground glow="115,174,67" />
      <div className="relative z-10 hidden shrink-0 lg:block">
        <LazsipSidebar userName={userName} />
      </div>

      <MobileSidebar open={mobileOpen} onClose={closeMobileSidebar}>
        <LazsipSidebar userName={userName} onNavigate={closeMobileSidebar} />
      </MobileSidebar>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <LazsipTopbar onMenuClick={() => setMobileOpen(true)} pendingTransactionsCount={pendingTransactionsCount} />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
