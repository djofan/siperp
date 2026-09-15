"use client";

import { useState } from "react";
import { LazsipSidebar } from "@/components/lazsip/admin/LazsipSidebar";
import { LazsipTopbar } from "@/components/lazsip/admin/LazsipTopbar";

export function LazsipAdminShellChrome({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-white">
      <div className="hidden shrink-0 border-r border-lazsip-primary-100 lg:block">
        <LazsipSidebar />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-lazsip-primary-900/40" onClick={() => setMobileOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 shadow-xl">
            <LazsipSidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <LazsipTopbar userName={userName} onMenuClick={() => setMobileOpen(true)} />
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
