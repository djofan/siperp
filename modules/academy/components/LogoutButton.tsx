"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  return <div><button disabled={pending} onClick={async () => {
    setPending(true); setError("");
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error();
      router.push("/academy"); router.refresh();
    } catch { setError("Gagal keluar. Coba lagi."); }
    finally { setPending(false); }
  }} className="rounded-xl border border-lazsip-primary-200 px-4 py-2.5 disabled:opacity-50">{pending ? "Keluar…" : "Keluar"}</button>
    {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
  </div>;
}
