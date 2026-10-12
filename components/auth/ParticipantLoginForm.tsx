"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { PasswordInput } from "./PasswordInput";
export function ParticipantLoginForm({ moduleSlug, successHref, allowEmail = false }: { moduleSlug: "academy" | "teknisi"; successHref: string; allowEmail?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const input = "h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500";
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/${moduleSlug}/masuk`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nip: data.get("nip"), password: data.get("password") }) });
      if (!response.ok) { setError("NIP atau password salah, atau akun tidak aktif."); return; }
      const result = await response.json();
      const nextPath = ["/teknisi/panel", "/teknisi/peserta", "/academy/lanjut"].includes(result.nextPath) ? result.nextPath : successHref;
      // Start the outlet workspace with the newly issued cookie, without anonymous prefetch state.
      if (moduleSlug === "teknisi") { window.location.assign(nextPath); return; }
      router.replace(nextPath); router.refresh();
    } catch { setError("Tidak dapat masuk. Periksa koneksi lalu coba lagi."); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="space-y-5 text-slate-900"><div><label htmlFor={`${moduleSlug}-nip`} className="mb-2 block text-sm font-medium">NIP</label><input id={`${moduleSlug}-nip`} name="nip" required maxLength={191} autoComplete="username" placeholder={moduleSlug === "teknisi" ? "Contoh: PTH01" : "Contoh: PAZ001"} className={input} />{allowEmail && <p className="mt-2 text-xs text-slate-500">Akun lama dan pengajar tetap dapat menggunakan email.</p>}</div><div><label htmlFor={`${moduleSlug}-password`} className="mb-2 block text-sm font-medium">Password</label><PasswordInput id={`${moduleSlug}-password`} name="password" required maxLength={72} autoComplete="current-password" className={input} /></div>{error && <p role="alert" className="text-sm text-red-700">{error}</p>}<button disabled={pending} className="w-full rounded-xl bg-emerald-600 px-5 py-3 font-semibold text-white disabled:opacity-50">{pending ? "Memeriksa…" : "Masuk"}</button></form>;
}
