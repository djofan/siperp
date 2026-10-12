"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function ParticipantLogout() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function logout() {
    setPending(true);
    try { const response = await fetch("/api/auth/logout", { method: "POST" }); if (!response.ok) throw new Error(); router.replace("/teknisi/masuk"); router.refresh(); }
    catch { setError("Belum berhasil keluar. Silakan coba lagi."); setPending(false); }
  }
  return <div><button type="button" disabled={pending} onClick={logout} className="rounded-xl border border-slate-300 px-4 py-2 text-sm">{pending ? "Memproses…" : "Keluar"}</button>{error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}</div>;
}
