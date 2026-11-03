"use client";

import { useState } from "react";
import { MobileSidebar } from "@/components/admin-shell/MobileSidebar";
import { Sidebar, type NavGroup } from "@/components/admin-shell/Sidebar";
import { Topbar } from "@/components/admin-shell/Topbar";
import { AdminGradientBackground } from "@/components/admin-shell/AdminGradientBackground";
import styles from "./AdminShellChrome.module.css";


export function AdminShellChrome({
  groups,
  userName,
  children,
  publicWebsiteHref,
}: {
  groups: NavGroup[];
  userName: string;
  children: React.ReactNode;
  publicWebsiteHref?: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  function closeMobileSidebar() { setMobileOpen(false); }

  return (
    <div className={`${styles.chrome} dark relative flex h-dvh overflow-hidden text-foreground`}>
      <AdminGradientBackground glow="116,175,39" placement="top" />
      <div className="relative z-10 hidden shrink-0 lg:block">
        <Sidebar groups={groups} userName={userName} />
      </div>

      <MobileSidebar open={mobileOpen} onClose={closeMobileSidebar}>
        <Sidebar groups={groups} userName={userName} onNavigate={closeMobileSidebar} />
      </MobileSidebar>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar onMenuClick={() => setMobileOpen(true)} publicWebsiteHref={publicWebsiteHref} />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
