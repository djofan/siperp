"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { inputClass, linkButton } from "./ui";

export function AcademyLoginForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true); setError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: String(data.get("email")).trim().toLowerCase(), password: data.get("password") }) });
      if (!response.ok) { setError("Email atau password salah, atau akun tidak aktif."); return; }
      router.push("/academy/belajar"); router.refresh();
    } catch { setError("Tidak dapat masuk. Periksa koneksi dan coba lagi."); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="space-y-5">
    <label className="block text-sm font-medium">Email<input name="email" type="email" required autoComplete="username" maxLength={191} className={inputClass} /></label>
    <label className="block text-sm font-medium">Password<input name="password" type="password" required autoComplete="current-password" className={inputClass} /></label>
    {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    <button disabled={pending} className={`${linkButton} w-full disabled:opacity-50`}>{pending ? "Memeriksa…" : "Masuk"}</button>
  </form>;
}
