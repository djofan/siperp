"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function PublicFrame({ children, navbar, footer, floating }: { children: ReactNode; navbar: ReactNode; footer: ReactNode; floating: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/lazsip/affiliator" || pathname.startsWith("/lazsip/affiliator/")) return <>{children}</>;
  return <>{navbar}<main className="flex-1">{children}</main>{footer}{floating}</>;
}
