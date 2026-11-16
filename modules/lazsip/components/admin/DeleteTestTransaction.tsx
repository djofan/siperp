"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import styles from "./DeleteTestTransaction.module.css";
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
    <Modal open={open} onClose={close} title="Hapus transaksi uji" className={styles.dialog}>
      <div className={styles.content}>
        <div className={styles.summary}>
          <div><strong>{row.label}</strong><code>{row.trackingCode}</code></div>
          <p>{row.donorName}</p>
          <strong>{new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(row.amount)}</strong>
        </div>
        <p className={styles.warning}>Catatan di web dihapus permanen dari laporan dan total donasi. Pembayaran iPaymu tidak dibatalkan dan tidak direfund.</p>
        <label className={styles.confirm}><input type="checkbox" checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} /><span>Ini hanya transaksi uji, bukan donasi atau zakat sungguhan.</span></label>
        <label className={styles.field}>Ketik kode transaksi untuk konfirmasi<input autoComplete="off" autoCapitalize="characters" spellCheck={false} value={code} disabled={busy} onChange={event => setCode(event.target.value)} /></label>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <div className={styles.actions}><button type="button" onClick={close} disabled={busy} className={styles.cancel}>Batal</button><button type="button" disabled={busy || !confirmed || code.trim() !== row.trackingCode} onClick={() => void remove()} className={styles.delete}>{busy ? "Menghapus…" : "Hapus permanen"}</button></div>
      </div>
    </Modal>
  </>;
}
