"use client";

import { useState } from "react";

export function HeroCekRiwayat() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || isPending) return;
    setIsPending(true); setError(null); setMessage(null);
    try {
      const response = await fetch("/api/lazsip/transactions/history", {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: email.trim(), action: "email" }),
      });
      const data = await response.json();
      if (!response.ok) {
        const detail = typeof data.error === "string" ? data.error : data.error?.message;
        throw new Error(typeof detail === "string" ? detail : "Riwayat belum dapat dikirim. Silakan coba lagi.");
      }
      setMessage(typeof data.message === "string" ? data.message : "Riwayat telah dikirim. Periksa inbox atau folder spam.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim riwayat. Silakan coba lagi.");
    } finally { setIsPending(false); }
  }

  return <>
    <p className="text-sm leading-relaxed text-lazsip-primary-800/80">Masukkan email yang digunakan saat donasi atau zakat. Kami akan mengirimkan ringkasan riwayat transaksi ke email tersebut.</p>
    <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2.5" aria-busy={isPending}>
      <input type="email" required aria-label="Email donatur" autoComplete="email" value={email} onChange={event => { setEmail(event.target.value); setMessage(null); setError(null); }} placeholder="nama@email.com" className="rounded-full border border-lazsip-primary-200 bg-lazsip-primary-50/40 px-4 py-3 text-sm text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400" />
      <button type="submit" disabled={isPending || !email.trim()} className="rounded-full bg-lazsip-primary-900 px-5 py-3 text-sm font-semibold text-white hover:bg-lazsip-primary-800 disabled:cursor-not-allowed disabled:opacity-60">{isPending ? "Mengirim riwayat..." : "Kirim Riwayat ke Email"}</button>
    </form>
    {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {message && <p role="status" className="mt-3 rounded-xl bg-lazsip-primary-50 p-3 text-sm text-lazsip-primary-900">{message}</p>}
    <p className="mt-5 border-t border-lazsip-primary-100 pt-4 text-xs leading-relaxed text-lazsip-primary-800/80">Email berisi tanggal, jenis transaksi, nominal, status pembayaran, dan kode transaksi. Nominal tidak termasuk biaya admin.</p>
  </>;
}
