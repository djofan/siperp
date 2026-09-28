"use client";

import { useState } from "react";

type SubmitStatus = "idle" | "sent" | "error";

export function HeroCekRiwayat() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || isPending) return;

    setIsPending(true);
    setMessage(null);
    setStatus("idle");
    try {
      const response = await fetch("/api/lazsip/transactions/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await response.json().catch(() => null);
      setMessage(data?.message ?? "Kalau email ini terdaftar, riwayat transaksi akan segera dikirimkan ke email tersebut.");
      setStatus("sent");
    } catch {
      setMessage("Gagal mengirim permintaan. Coba lagi.");
      setStatus("error");
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
          className="inline-flex items-center justify-center gap-2 rounded-full bg-lazsip-primary-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-lazsip-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending && (
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
          {isPending ? "Mengirim..." : "Kirim Riwayat ke Email"}
        </button>
      </form>

      {message && (
        <div
          role="status"
          className={`mt-3 flex items-start gap-2.5 rounded-xl p-3 text-xs leading-relaxed ${
            status === "error"
              ? "bg-red-50 text-red-700"
              : "bg-lazsip-secondary-50 text-lazsip-secondary-800"
          }`}
        >
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/60">
            {status === "error" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3 w-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="h-3 w-3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l4 4L19 7" />
              </svg>
            )}
          </span>
          <p>
            {status === "sent" && <span className="mb-0.5 block font-bold">Permintaan berhasil dikirim.</span>}
            {message}
          </p>
        </div>
      )}

      <ul className="mt-5 flex flex-col gap-2.5 border-t border-lazsip-primary-100 pt-4 text-xs leading-relaxed text-lazsip-primary-800/60">
        <li className="flex items-start gap-2">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-lazsip-primary-400" />
          Riwayat lengkap (donasi, zakat, status) dikirim otomatis ke email yang Anda masukkan.
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-lazsip-primary-400" />
          Demi privasi, riwayat tidak ditampilkan langsung di layar ini.
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-lazsip-primary-400" />
          Gunakan email yang sama persis dengan yang dipakai saat transaksi.
        </li>
      </ul>
    </>
  );
}
