"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "./ui/button";
import { LogOut } from "lucide-react";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return <div><Button variant="outline" size={compact ? "sm" : "default"} disabled={pending} onClick={async () => {
    setPending(true); setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error();
      router.push("/academy"); router.refresh();
    } catch { setError("Gagal keluar. Coba lagi."); }
    finally { setPending(false); }
  }} className="gap-2">{compact && <LogOut className="size-3.5" />}{pending ? "Keluar…" : "Keluar"}</Button>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
  </div>;
}
