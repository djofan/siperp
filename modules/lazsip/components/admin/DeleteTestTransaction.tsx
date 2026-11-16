"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import type { TransactionRow } from "./TransactionTable";

export function DeleteTestTransaction({ row }: { row: TransactionRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function close() { if (!busy) setOpen(false); }
  async function remove() {
    if (busy || !confirmed || code.trim() !== row.trackingCode) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/lazsip/admin/transactions/${row.source}/${encodeURIComponent(row.id)}`, {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmationCode: code.trim(), testTransaction: confirmed }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(typeof data?.error?.message === "string" ? data.error.message : "Transaksi belum dapat dihapus. Silakan coba lagi.");
      setOpen(false); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Koneksi gagal. Silakan coba lagi."); }
    finally { setBusy(false); }
  }
  return <>
    <button type="button" onClick={() => { setOpen(true); setCode(""); setConfirmed(false); setError(""); }} className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 dark:bg-red-400/10 dark:text-red-300 dark:hover:bg-red-400/20"><Trash2 size={14} />Hapus transaksi uji</button>
    <Modal open={open} onClose={close} title="Hapus transaksi uji">
      <div className="space-y-4 whitespace-normal">
        <div className="rounded-xl bg-surface-muted p-4"><p className="text-sm font-semibold">{row.label}</p><p className="mt-1 break-all font-mono text-sm">{row.trackingCode}</p><p className="mt-2 text-sm">{row.donorName} · {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(row.amount)}</p></div>
        <p className="text-sm leading-relaxed text-foreground/75">Catatan transaksi di web akan dihapus permanen dan tidak lagi masuk laporan atau total donasi. Tindakan ini tidak membatalkan pembayaran atau melakukan refund di iPaymu.</p>
        <label className="flex items-start gap-3 rounded-xl bg-surface-muted p-3 text-sm leading-relaxed"><input type="checkbox" className="mt-1 shrink-0" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />Saya memastikan transaksi ini hanya data uji, bukan donasi atau zakat sungguhan.</label>
        <label className="block text-sm font-medium">Ketik kode transaksi untuk konfirmasi<input autoComplete="off" value={code} disabled={busy} onChange={event => setCode(event.target.value)} className="mt-2 min-h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm text-foreground" /></label>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-300">{error}</p>}
        <div className="flex justify-end gap-2"><button type="button" onClick={close} disabled={busy} className="min-h-11 rounded-xl bg-surface-muted px-4 text-sm font-semibold">Batal</button><button type="button" disabled={busy || !confirmed || code.trim() !== row.trackingCode} onClick={() => void remove()} className="min-h-11 rounded-xl bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-40">{busy ? "Menghapus…" : "Hapus permanen"}</button></div>
      </div>
    </Modal>
  </>;
}
