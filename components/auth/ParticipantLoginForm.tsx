"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PasswordInput } from "./PasswordInput";
export function ParticipantLoginForm({ moduleSlug, successHref }: { moduleSlug: "academy" | "teknisi"; successHref: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const input = "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return; setPending(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/${moduleSlug}/masuk`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: String(data.get("code")).trim().toUpperCase(), password: data.get("password") }) });
      if (!response.ok) { setError("Kode akun atau password salah, atau akun tidak memiliki akses ke modul ini."); return; }
      const result = await response.json();
      const nextPath = ["/teknisi/panel", "/teknisi/peserta", "/academy/lanjut"].includes(result.nextPath) ? result.nextPath : successHref;
      // Start the outlet workspace with the newly issued cookie, without anonymous prefetch state.
      if (moduleSlug === "teknisi") { window.location.assign(nextPath); return; }
      router.replace(nextPath); router.refresh();
    } catch { setError("Tidak dapat masuk. Periksa koneksi lalu coba lagi."); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="space-y-5 text-slate-900"><div><label htmlFor={`${moduleSlug}-code`} className="mb-2 block text-sm font-medium">Kode akun</label><input id={`${moduleSlug}-code`} name="code" required maxLength={32} pattern="[a-zA-Z0-9][a-zA-Z0-9_\-]{2,31}" autoComplete="username" autoCapitalize="characters" spellCheck={false} placeholder={moduleSlug === "teknisi" ? "Contoh: PTH01" : "Contoh: PAZ001"} className={input} /><p className="mt-2 text-xs text-slate-500">Gunakan kode akun dari pengelola. Kode NIP lama tetap dapat digunakan.</p></div><div><label htmlFor={`${moduleSlug}-password`} className="mb-2 block text-sm font-medium">Password</label><PasswordInput id={`${moduleSlug}-password`} name="password" required maxLength={72} autoComplete="current-password" className={input} /></div>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={pending} className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{pending ? "Memeriksa…" : "Masuk"}</button></form>;
}
