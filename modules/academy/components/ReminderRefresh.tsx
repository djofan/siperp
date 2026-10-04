"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export function ReminderRefresh() {
  const router = useRouter();
  useEffect(() => {
    const timer = window.setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 60000);
    return () => window.clearInterval(timer);
  }, [router]);
  return null;
}
