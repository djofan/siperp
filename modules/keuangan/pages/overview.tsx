import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { ApiError } from "@/lib/api";
import { getKeuanganOverview } from "../api/overview";
import styles from "../styles/workspace.module.css";

export const metadata = { title: "Keuangan | SIPERP", robots: { index: false, follow: false } };

export default async function KeuanganOverviewPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login");
  let overview;
  try { overview = await getKeuanganOverview(); }
  catch (error) {
    if (!(error instanceof ApiError) || ![401, 403, 404].includes(error.status)) throw error;
    return <main className={styles.workspace}><Link href="/admin">← Dashboard SIPERP</Link><h1>Keuangan</h1><p>Modul belum aktif atau akun Anda belum memiliki akses Keuangan. Hubungi pengelola SIPERP.</p></main>;
  }
  const cards = [
    ["Pengeluaran tercatat", overview.counts.expenses],
    ["Persetujuan menunggu Anda", overview.counts.myPendingApprovals],
    ["Sumber dana", overview.counts.sources],
    ["Kategori", overview.counts.categories],
  ] as const;
  return <main className={styles.workspace}>
    <Link href="/admin">← Dashboard SIPERP</Link>
    <header><div><p className={styles.eyebrow}>Ruang kerja SIPERP</p><h1>Keuangan</h1><p>Ringkasan pengeluaran dan penugasan persetujuan.</p></div><span className={styles.role}>{overview.roleLabel}</span></header>
    <section className={styles.notice} aria-label="Status modul"><h2>Modul sedang disiapkan</h2><p>Ringkasan ini hanya untuk dibaca. Data web keuangan lama belum diimpor. Pembuatan pengeluaran dan keputusan persetujuan belum tersedia.</p></section>
    <section className={styles.cards} aria-label="Ringkasan Keuangan">{cards.filter(([, value]) => value !== null).map(([label, value]) => <article key={label}><h2>{label}</h2><strong>{value}</strong></article>)}</section>
    <section className={styles.panel}><h2>Pengeluaran dan pembayaran</h2><p>Pengeluaran yang dicatat atau disetujui belum berarti sudah dibayar. Ringkasan ini tidak menghitung saldo bank atau mengubah transaksi pembayaran SIPERP.</p>{overview.counts.expenses === 0 && <p>Belum ada pengeluaran dalam modul Keuangan.</p>}</section>
  </main>;
}
