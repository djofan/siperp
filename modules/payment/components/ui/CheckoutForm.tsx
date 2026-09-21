"use client";

import { useEffect, useState } from "react";

function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

interface Transaction {
  id: string;
  trackingCode: string;
  amount: number;
  adminFee: number;
  paymentMethod: string;
  status: string;
  destinationAccount: { bankName: string; accountNumber: string; accountName: string } | null;
}

const POLL_INTERVAL_MS = 5_000;

export function CheckoutForm({
  transaction: initialTransaction,
  midtransClientKey,
}: {
  transaction: Transaction;
  midtransClientKey: string | null;
}) {
  const [transaction, setTransaction] = useState(initialTransaction);
  const [copied, setCopied] = useState(false);
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

  // Polling ringan: begitu admin menandai lunas/gagal (lihat CLAUDE.md §7 aturan #1 — status
  // TIDAK PERNAH diubah dari sisi client sendiri), halaman ini otomatis memperbarui tampilan
  // tanpa payer perlu refresh manual.
  useEffect(() => {
    if (transaction.status !== "pending") return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/payment/status/${transaction.id}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status !== "pending") setTransaction((prev) => ({ ...prev, status: data.status }));
      } catch {
        // Diam-diam coba lagi di interval berikutnya — tidak perlu ganggu payer dengan error koneksi sementara.
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [transaction.id, transaction.status]);

  function copyAccountNumber(accountNumber: string) {
    navigator.clipboard?.writeText(accountNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (transaction.status === "paid") {
    return (
      <div className="flex flex-col gap-4">
        {trackingCodeCard}
        <div className="flex flex-col gap-2 rounded-2xl bg-success-soft p-6 text-success">
          <h2 className="text-lg font-bold">Pembayaran Diterima</h2>
          <p className="text-sm leading-relaxed opacity-90">
            Terima kasih! Pembayaran Anda sebesar {formatRupiah(transaction.amount + transaction.adminFee)} sudah
            dikonfirmasi.
          </p>
        </div>
      </div>
    );
  }

  if (transaction.status === "failed") {
    return (
      <div className="flex flex-col gap-4">
        {trackingCodeCard}
        <div className="flex flex-col gap-2 rounded-2xl bg-danger-soft p-6 text-danger">
          <h2 className="text-lg font-bold">Pembayaran Gagal</h2>
          <p className="text-sm leading-relaxed opacity-90">
            Transaksi ini ditandai gagal/kedaluwarsa. Silakan ulangi dari halaman sebelumnya kalau masih ingin
            melanjutkan.
          </p>
        </div>
      </div>
    );
  }

  // midtransClientKey belum diisi di lingkungan ini (lihat .env) — jadi tetap di jalur transfer
  // manual di bawah selama itu, biar tidak menampilkan tombol bayar yang belum benar-benar tersambung.
  if (midtransClientKey) {
    return (
      <div className="flex flex-col gap-4">
        {trackingCodeCard}
        <div className="flex flex-col gap-3 rounded-2xl bg-surface p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
          <p className="text-sm text-foreground/70">
            Pembayaran online lewat Midtrans belum aktif di lingkungan ini. Silakan pakai instruksi transfer manual
            di bawah untuk sementara.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {trackingCodeCard}
      <div className="flex flex-col gap-4 rounded-2xl bg-surface p-6 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)]">
        <h2 className="text-base font-bold text-foreground">Instruksi Transfer</h2>
      {transaction.destinationAccount ? (
        <div className="flex flex-col gap-1 rounded-xl bg-surface-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
            {transaction.destinationAccount.bankName} &middot; a.n. {transaction.destinationAccount.accountName}
          </p>
          <div className="flex items-center justify-between gap-3">
            <p className="font-mono text-lg font-bold text-foreground">{transaction.destinationAccount.accountNumber}</p>
            <button
              type="button"
              onClick={() => copyAccountNumber(transaction.destinationAccount!.accountNumber)}
              className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              {copied ? "Tersalin!" : "Salin"}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-foreground/60">Rekening tujuan belum tersedia. Silakan hubungi pengelola.</p>
      )}
      <p className="text-sm leading-relaxed text-foreground/70">
        Transfer tepat {formatRupiah(transaction.amount + transaction.adminFee)} via {transaction.paymentMethod}, lalu
        tunggu — halaman ini otomatis memperbarui begitu admin mengonfirmasi penerimaan dana.
      </p>
        <div className="flex items-center gap-2 rounded-xl bg-surface-muted px-4 py-3 text-sm text-foreground/60">
          <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-accent" />
          Menunggu konfirmasi pembayaran...
        </div>
      </div>
    </div>
  );
}
