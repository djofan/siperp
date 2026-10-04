"use client";

import { useEffect, useRef, useState } from "react";
import { formatRupiah, formatDateTime } from "@/modules/lazsip/components/format";

interface HistoryItem {
  type: "donasi" | "zakat";
  label: string;
  amount: number;
  status: string;
  createdAt: string;
}
const statuses: Record<string, string> = {
  paid: "Berhasil", pending: "Menunggu pembayaran", failed: "Gagal",
  expired: "Kedaluwarsa", cancelled: "Dibatalkan",
};

export function HeroCekRiwayat() {
  const [email, setEmail] = useState("");
  const [searchedEmail, setSearchedEmail] = useState("");
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [open, setOpen] = useState(false);
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    dialog?.showModal();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previous;
    };
  }, [open]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || isPending) return;
    setIsPending(true);
    setError(null);
    try {
      const response = await fetch("/api/lazsip/transactions/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), action: "request" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Riwayat belum dapat dimuat.");
      setChallengeId(data.challengeId);
      setCode("");
      setVerified(false);
      setItems([]);
      setSearchedEmail(email.trim());
      setOpen(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat riwayat. Silakan coba lagi.");
    } finally {
      setIsPending(false);
    }
  }

  async function handleVerify(event: React.FormEvent) {
    event.preventDefault();
    if (isPending) return;
    setIsPending(true);
    setError(null);
    try {
      const response = await fetch("/api/lazsip/transactions/history", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify", email: searchedEmail, challengeId, code }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Verifikasi gagal.");
      setItems(data.items);
      setVerified(true);
      setCode("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verifikasi gagal. Coba lagi.");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <>
      <p className="text-sm leading-relaxed text-lazsip-primary-800/80">
        Masukkan email yang dipakai saat donasi atau zakat. Verifikasi kode yang dikirim ke email sebelum membuka riwayat.
      </p>
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2.5">
        <input type="email" required aria-label="Email donatur" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nama@email.com" className="rounded-full border border-lazsip-primary-200 bg-lazsip-primary-50/40 px-4 py-3 text-sm text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400" />
        <button type="submit" disabled={isPending || !email.trim()} className="rounded-full bg-lazsip-primary-900 px-5 py-3 text-sm font-semibold text-white hover:bg-lazsip-primary-800 disabled:cursor-not-allowed disabled:opacity-60">
          {isPending ? "Memproses..." : "Kirim Kode Verifikasi"}
        </button>
      </form>
      {error && !open && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <p className="mt-5 border-t border-lazsip-primary-100 pt-4 text-xs leading-relaxed text-lazsip-primary-800/80">
        Menampilkan donasi dan zakat LAZSIP beserta statusnya. Nominal tidak termasuk biaya admin.
      </p>
      <dialog ref={dialogRef} onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }} aria-labelledby="history-title" className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-3xl bg-white p-0 text-left text-lazsip-primary-900 shadow-xl backdrop:bg-black/60">
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-lazsip-primary-100 bg-white p-5">
          <div><h2 id="history-title" className="text-lg font-bold">Riwayat Pembayaran</h2><p className="mt-1 break-all text-xs text-lazsip-primary-800/80">{searchedEmail}</p></div>
          <button type="button" autoFocus onClick={() => setOpen(false)} aria-label="Tutup riwayat" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-lazsip-primary-50 text-xl">×</button>
        </div>
        <div className="p-5">
          {!verified ? <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-sm">Masukkan 6 digit kode dari email Anda. Kode berlaku 10 menit, sekali pakai, dengan maksimal 5 percobaan.</p>
            <input aria-label="Kode verifikasi email" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} className="w-full rounded-xl border border-lazsip-primary-200 px-4 py-3 text-center text-xl tracking-widest" />
            <button disabled={isPending || code.length !== 6} className="w-full rounded-full bg-lazsip-primary-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{isPending ? "Memverifikasi..." : "Verifikasi & Lihat Riwayat"}</button>
            <p className="text-xs">Belum menerima kode? Periksa folder spam. Tutup popup untuk meminta kode baru setelah 60 detik.</p>
          </form> : items.length === 0 ? <p className="py-6 text-center text-sm">Belum ada transaksi untuk email ini. Periksa kembali email yang digunakan saat pembayaran.</p> : (
            <ul className="space-y-3">
              {items.map((item, index) => (
                <li key={index} className="rounded-2xl border border-lazsip-primary-100 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2"><span className="text-xs font-semibold uppercase">{item.type}</span><span className={`rounded-full px-2.5 py-1 text-xs ${item.status === "paid" ? "bg-green-50 text-green-800" : item.status === "pending" ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700"}`}>{statuses[item.status] ?? item.status}</span></div>
                  <p className="mt-2 break-words text-sm font-semibold">{item.label}</p>
                  <p className="mt-2 text-lg font-bold">{formatRupiah(item.amount)}</p>
                  <p className="mt-1 text-xs text-lazsip-primary-800/80">{formatDateTime(new Date(item.createdAt))}</p>
                </li>
              ))}
            </ul>
          )}
          {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="button" onClick={() => setOpen(false)} className="mt-5 w-full rounded-full border border-lazsip-primary-200 px-4 py-2.5 text-sm font-semibold">Tutup</button>
        </div>
      </dialog>
    </>
  );
}
