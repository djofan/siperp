"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Bell, ArrowUpRight, RefreshCw, X } from "lucide-react";
import { formatRupiah } from "../format";
import styles from "./LazsipNotifications.module.css";

interface Activity {
  id: string; label: string; donorName: string; amount: number;
  status: string; createdAt: string;
}
interface Summary {
  counts: { pendingTransactions: number };
  newApplicants: number; recent: Activity[];
}
const statuses: Record<string, string> = { paid: "Lunas", pending: "Menunggu pembayaran", failed: "Gagal" };

export function LazsipNotifications({ pendingCount }: { pendingCount: number }) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const count = (summary?.counts.pendingTransactions ?? pendingCount) + (summary?.newApplicants ?? 0);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/lazsip/dashboard?limit=8&days=1", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("load");
        const result = await response.json();
        if (!result.data?.counts || !Array.isArray(result.data.recent)) throw new Error("shape");
        if (!controller.signal.aborted) setSummary(result.data);
      } catch {
        if (!controller.signal.aborted) setError("Informasi belum dapat diperbarui. Silakan coba lagi.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    const interval = window.setInterval(() => { if (document.visibilityState === "visible") void load(); }, 60000);
    const dismiss = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", escape);
    return () => {
      controller.abort(); window.clearInterval(interval);
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", escape);
    };
  }, [open, revision]);

  return <div ref={container} className={styles.root}>
    <button ref={trigger} type="button" className={styles.trigger} aria-label={`Notifikasi LAZSIP${count ? `, ${count} perlu dipantau` : ""}`} aria-expanded={open} aria-controls="lazsip-notifications" onClick={() => setOpen(!open)}>
      <Bell size={20} />{count > 0 && <span className={styles.badge}>{count > 99 ? "99+" : count}</span>}
    </button>
    {open && <section id="lazsip-notifications" aria-label="Notifikasi LAZSIP" className={styles.panel}>
      <header><div><h2>Aktivitas LAZSIP</h2><p>Transaksi terbaru & tindak lanjut</p></div><button type="button" aria-label="Tutup notifikasi" onClick={() => setOpen(false)}><X size={18} /></button></header>
      <div className={styles.content}>
        <Link href="/admin/lazsip/transaksi" className={styles.attention} onClick={() => setOpen(false)}><span><strong>{summary?.counts.pendingTransactions ?? pendingCount} transaksi menunggu</strong><small>Pantau pembayaran dan status terbaru.</small></span><ArrowUpRight size={17} /></Link>
        {!!summary?.newApplicants && <Link href="/admin/lazsip/pendaftar" className={styles.attention} onClick={() => setOpen(false)}><span><strong>{summary.newApplicants} pendaftar baru</strong><small>Periksa pengajuan program yang masuk.</small></span><ArrowUpRight size={17} /></Link>}
        <div className={styles.subtitle}><h3>Transaksi masuk terbaru</h3><button type="button" disabled={loading} aria-label="Perbarui notifikasi" onClick={() => setRevision(revision + 1)}><RefreshCw size={15} /></button></div>
        {loading && <p role="status" className={styles.note}>Memperbarui aktivitas…</p>}
        {error && <p role="alert" className={styles.error}>{error}</p>}
        {!loading && !error && summary?.recent.length === 0 && <p className={styles.note}>Belum ada transaksi masuk.</p>}
        {summary?.recent.map((item) => <Link key={item.id} href="/admin/lazsip/transaksi" className={styles.activity} onClick={() => setOpen(false)}>
          <div><strong>{item.donorName || "Donatur"}</strong><b>{formatRupiah(item.amount)}</b></div>
          <p>{item.label}</p><div><span data-status={item.status}>{statuses[item.status] ?? item.status}</span><time dateTime={item.createdAt}>{new Intl.DateTimeFormat("id-ID", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(item.createdAt))}</time></div>
        </Link>)}
      </div>
      <footer><small>Angka lonceng: transaksi menunggu + pendaftar baru.</small><Link href="/admin/lazsip/transaksi" onClick={() => setOpen(false)}>Lihat semua transaksi <ArrowUpRight size={15} /></Link></footer>
    </section>}
  </div>;
}
