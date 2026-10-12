"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => { const id = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 30000); return () => clearInterval(id); }, [router]);
  return <span className="text-xs text-foreground/50">Diperbarui otomatis setiap 30 detik</span>;
}
