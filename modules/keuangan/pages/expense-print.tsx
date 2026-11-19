import Link from "next/link";
import { notFound } from "next/navigation";
import { getKeuanganOverview } from "../api/overview";
import { getExpense } from "../api/workflow";
import { PrintButton } from "../components/PrintButton";
import { ApplicationFields } from "../components/ApplicationFields";
import { Status, rupiah, date } from "../components/ui";

export const metadata = { title: "Pengajuan Kas Keuangan", robots: { index: false, follow: false } };
export default async function ExpensePrint({ params }: { params: Promise<{ id: string }> }) {
  const overview = await getKeuanganOverview();
  if (overview.role === "treasurer") notFound();
  const e = await getExpense((await params).id);
  return <><div className="finance-print-toolbar"><Link href={`/admin/keuangan/pengeluaran/${e.id}`}>← Kembali ke pengajuan</Link><PrintButton /></div>
    <article className="finance-print"><header><p>SOLIDARITAS INSAN PEDULI</p><h1>Pengajuan Kas Keuangan</h1><p>Referensi: {e.id}</p><Status value={e.status} /></header>
      <ApplicationFields expense={e} />
      <section><h2>Deskripsi pengajuan</h2><p className="finance-text">{e.description || "Tidak tercatat"}</p></section>
      <section><h2>Nominal pengajuan</h2><strong className="finance-amount">{rupiah(e.amount)}</strong></section>
      <section><h2>Persetujuan</h2>{e.signoffs.length ? <ul>{e.signoffs.map((a, i) => <li key={i}>{a.name} — <Status value={a.decision} />{a.closed && " · Penugasan ditutup"}</li>)}</ul> : <p>Belum ada penugasan persetujuan.</p>}</section>
      <footer><p>Dokumen dicetak dari data pengajuan. Persetujuan bukan bukti pembayaran.</p><p>Dicatat {date(e.createdAt)} · Arsip {e.origin === "legacy" ? "data lama" : "SIPERP"}</p></footer>
    </article>
  </>;
}
