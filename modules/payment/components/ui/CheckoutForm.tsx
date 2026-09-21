"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STATUS = {
  pending: { title: "Menunggu konfirmasi admin", description: "Admin modul asal akan menandai transaksi ini lunas atau gagal melalui halaman Kelola Transaksi." },
  paid: { title: "Simulasi pembayaran berhasil", description: "Admin telah menandai transaksi ini lunas. Pembayaran sudah tercatat pada modul asal." },
  failed: { title: "Simulasi pembayaran gagal", description: "Admin telah menandai transaksi ini gagal. Nominal transaksi ini tidak dihitung sebagai pembayaran lunas." },
};
type PaymentStatus = keyof typeof STATUS;

export function CheckoutForm({ transaction }: { transaction: { id: string; trackingCode: string; status: string; moduleSource: string } }) {
  const [status, setStatus] = useState<PaymentStatus>(transaction.status in STATUS ? transaction.status as PaymentStatus : "pending");
  const [error, setError] = useState<string | null>(null);

  const [codeCopied, setCodeCopied] = useState(false);

  function copyTrackingCode() {
    navigator.clipboard?.writeText(transaction.trackingCode).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  }

  const trackingCodeCard = (
    <div className="flex flex-col gap-2 rounded-2xl border-2 border-dashed border-accent/40 bg-accent-soft p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-accent-hover">Kode Pelacakan Anda — Simpan Baik-Baik</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-2xl font-extrabold tracking-wider text-foreground">{transaction.trackingCode}</p>
        <button
          type="button"
          onClick={copyTrackingCode}
          className="shrink-0 rounded-full bg-accent px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          {codeCopied ? "Tersalin!" : "Salin"}
        </button>
      </div>
      <p className="text-xs text-foreground/60">Pakai kode ini di menu &quot;Cek Status&quot; di beranda buat cek status transaksi kapan saja.</p>
    </div>
  );

  useEffect(() => {
    if (status !== "pending") return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let controller: AbortController | undefined;

    async function checkStatus() {
      controller = new AbortController();
      const timeout = setTimeout(() => controller?.abort(), 10000);
      let keepChecking = true;
      try {
        const response = await fetch(`/api/payment/status/${encodeURIComponent(transaction.id)}`, {
          cache: "no-store", signal: controller.signal,
        });
        if (stopped) return;
        if (response.status === 404) {
          keepChecking = false;
          setError("Transaksi tidak ditemukan. Periksa kembali kode transaksi Anda.");
          return;
        }
        if (!response.ok) throw new Error("Status unavailable");
        const data = await response.json();
        if (data.id !== transaction.id || !["pending", "paid", "failed"].includes(data.status)) {
          throw new Error("Invalid status response");
        }
        if (stopped) return;
        setError(null);
        setStatus(data.status);
        keepChecking = data.status === "pending";
      } catch {
        if (!stopped) setError("Status belum dapat diperbarui. Kami akan mencoba lagi otomatis; Anda tidak perlu membuat transaksi baru.");
      } finally {
        clearTimeout(timeout);
        if (!stopped && keepChecking) timer = setTimeout(checkStatus, 5000);
      }
    }

    void checkStatus();
    return () => {
      stopped = true;
      clearTimeout(timer);
      controller?.abort();
    };
  }, [transaction.id, status]);

  const current = STATUS[status];
  return (
    <div className="mt-6 space-y-5">
      {trackingCodeCard}
      <div role="status" aria-live="polite" className={`rounded-2xl border p-5 ${status === "paid" ? "border-emerald-200 bg-emerald-50" : status === "failed" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"}`}>
        <h2 className="font-semibold text-slate-900">{current.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{current.description}</p>
        {status === "pending" && !error && <p className="mt-3 text-xs text-slate-500">Status diperiksa otomatis setiap 5 detik. Tidak perlu refresh halaman.</p>}
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <Link href={transaction.moduleSource === "sarsip" ? "/sarsip/campaign" : "/lazsip"} className="inline-flex rounded-full bg-emerald-950 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-900">
        Kembali ke modul asal
      </Link>
    </div>
  );
}
