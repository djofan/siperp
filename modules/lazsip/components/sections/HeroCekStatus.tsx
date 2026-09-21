"use client";

import { useState } from "react";
import { formatRupiah, formatDate } from "@/modules/lazsip/components/format";

interface StatusResult {
  found: boolean;
  type?: "donasi" | "zakat";
  label?: string;
  amount?: number;
  adminFee?: number;
  paymentMethod?: string;
  status?: string;
  createdAt?: string;
}

const STATUS_META: Record<string, { label: string; className: string }> = {
  paid: { label: "Lunas", className: "bg-lazsip-secondary-50 text-lazsip-secondary-700" },
  pending: { label: "Menunggu Pembayaran", className: "bg-amber-50 text-amber-700" },
  failed: { label: "Gagal", className: "bg-red-50 text-red-700" },
};

export function HeroCekStatus() {
  const [kode, setKode] = useState("");
  const [result, setResult] = useState<StatusResult | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = kode.trim();
    if (!trimmed) return;

    setIsPending(true);
    const response = await fetch("/api/lazsip/transactions/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: trimmed }),
    });
    const data = await response.json();
    setResult(data);
    setShowModal(true);
    setIsPending(false);
  }

  return (
    <>
      <p className="text-sm leading-relaxed text-lazsip-primary-800/60">
        Sudah bayar? Masukkan kode transaksi yang tampil setelah donasi/zakat untuk cek status terkini.
      </p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2.5">
        <input
          value={kode}
          onChange={(e) => setKode(e.target.value)}
          placeholder="Masukkan kode transaksi"
          className="rounded-full border border-lazsip-primary-200 bg-lazsip-primary-50/40 px-4 py-3 text-sm text-lazsip-primary-900 outline-none focus:ring-2 focus:ring-lazsip-primary-400"
        />
        <button
          type="submit"
          disabled={isPending || !kode.trim()}
          className="inline-flex items-center justify-center rounded-full bg-lazsip-primary-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-lazsip-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Memeriksa..." : "Cek Status"}
        </button>
      </form>

      <ul className="mt-5 flex flex-col gap-2.5 border-t border-lazsip-primary-100 pt-4 text-xs leading-relaxed text-lazsip-primary-800/60">
        <li className="flex items-start gap-2">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-lazsip-primary-400" />
          Kode transaksi (format LZS-XXXXXX) muncul di layar begitu Anda selesai donasi/bayar zakat.
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-lazsip-primary-400" />
          Kode yang sama juga dikirim ke email Anda kalau diisi saat transaksi.
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-lazsip-primary-400" />
          Bisa dicek kapan saja, tanpa perlu login.
        </li>
      </ul>

      {showModal && result && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-lazsip-primary-900/50" onClick={() => setShowModal(false)} aria-hidden />
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-left shadow-xl">
            {result.found && result.status ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-lazsip-primary-800/50">
                    {result.type === "donasi" ? "Donasi" : "Zakat"}
                  </p>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-3 py-1 text-xs font-bold ${STATUS_META[result.status]?.className ?? "bg-lazsip-primary-900/5 text-lazsip-primary-900/60"}`}
                  >
                    {STATUS_META[result.status]?.label ?? result.status}
                  </span>
                </div>

                <div className="mt-4 flex flex-col gap-2.5 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-lazsip-primary-800/60">{result.type === "donasi" ? "Campaign" : "Jenis"}</span>
                    <span className="text-right font-semibold text-lazsip-primary-900">{result.label}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lazsip-primary-800/60">Nominal</span>
                    <span className="font-semibold text-lazsip-primary-900">{formatRupiah(result.amount ?? 0)}</span>
                  </div>
                  {!!result.adminFee && (
                    <div className="flex items-center justify-between">
                      <span className="text-lazsip-primary-800/60">Biaya Admin</span>
                      <span className="font-semibold text-lazsip-primary-900">{formatRupiah(result.adminFee)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-lazsip-primary-800/60">Metode Pembayaran</span>
                    <span className="font-semibold text-lazsip-primary-900">{result.paymentMethod}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-lazsip-primary-100 pt-2.5">
                    <span className="text-lazsip-primary-800/60">Tanggal</span>
                    <span className="font-semibold text-lazsip-primary-900">
                      {result.createdAt ? formatDate(new Date(result.createdAt)) : "-"}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center">
                <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </span>
                <p className="mt-3 text-sm font-bold text-lazsip-primary-900">Kode Tidak Ditemukan</p>
                <p className="mt-1.5 text-sm leading-relaxed text-lazsip-primary-800/60">
                  Periksa kembali kode transaksi Anda, atau hubungi CS kami kalau masih bermasalah.
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="mt-6 w-full rounded-full border border-lazsip-primary-200 px-4 py-2.5 text-sm font-semibold text-lazsip-primary-800 transition-colors hover:border-lazsip-primary-400"
            >
              Tutup
            </button>
          </div>
        </div>
      )}
    </>
  );
}
