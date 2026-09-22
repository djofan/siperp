"use client";

import { useState } from "react";

export function HeroCekRiwayat() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) return;

    setIsPending(true);
    setMessage(null);
    try {
      const response = await fetch("/api/lazsip/transactions/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await response.json().catch(() => null);
      setMessage(data?.message ?? "Kalau email ini terdaftar, riwayat transaksi akan segera dikirimkan ke email tersebut.");
    } catch {
      setMessage("Gagal mengirim permintaan. Coba lagi.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <p className="text-sm leading-relaxed text-lazsip-primary-800/60">
        Masukkan email yang Anda pakai saat donasi/zakat — kami kirimkan riwayat lengkap transaksi Anda lewat email itu.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2.5">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@email.com"
          className="rounded-full border border-lazsip-primary-200 bg-lazsip-primary-50/40 px-4 py-3 text-sm text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400"
        />
        <button
          type="submit"
          disabled={isPending || !email.trim()}
          className="inline-flex items-center justify-center rounded-full bg-lazsip-primary-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-lazsip-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Mengirim..." : "Kirim Riwayat ke Email"}
        </button>
      </form>

      {message && (
        <p role="status" className="mt-3 rounded-xl bg-lazsip-primary-50/60 p-3 text-xs leading-relaxed text-lazsip-primary-800/80">
          {message}
        </p>
      )}
    </>
  );
}
