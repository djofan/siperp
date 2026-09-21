import Link from "next/link";
import { listEntries, listAdminTransactions, money } from "@/modules/sarsip/api/data";
export default async function Dashboard() {
  const [entries, transactions] = await Promise.all([listEntries(undefined, true), listAdminTransactions()]);
  const total = transactions.filter((t) => t.status === "paid").reduce((sum, t) => sum + t.amount, 0);
  return <div className="space-y-8"><div><p className="text-xs font-bold uppercase tracking-widest text-orange-600">SARSIP / Admin</p><h1 className="mt-2 text-3xl font-bold text-foreground">Pos koordinasi digital</h1><p className="mt-3 text-sm text-foreground/60">Kelola informasi tim dan dukungan masyarakat untuk kegiatan SAR.</p></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[
      ["Kegiatan", entries.filter((e) => e.kind === "kegiatan" && e.status !== "archived").length],
      ["Campaign terbuka", entries.filter((e) => e.kind === "campaign" && e.status === "published").length],
      ["Donasi terkonfirmasi", money(total)],
      ["Menunggu konfirmasi", transactions.filter((t) => t.status === "pending").length],
    ].map(([label, value]) => <div key={label} className="rounded-2xl border border-border bg-surface p-5"><p className="text-sm text-foreground/60">{label}</p><p className="mt-3 text-2xl font-bold text-foreground">{value}</p></div>)}</div>
    <section className="rounded-2xl border border-border bg-surface p-6"><h2 className="text-lg font-bold text-foreground">Mulai mengelola SARSIP</h2><div className="mt-5 grid gap-4 md:grid-cols-3">{[
      ["kegiatan", "Catat aksi di lapangan", "Dokumentasikan bantuan bencana, pencarian, dan kegiatan tim."],
      ["berita", "Tulis berita terbaru", "Bagikan kabar dan informasi terbaru dari tim SARSIP."],

      ["campaign", "Buka dukungan donasi", "Tentukan kebutuhan dana dan ajak masyarakat berpartisipasi."],
    ].map(([kind,title,description]) => <Link key={kind} href={`/admin/sarsip/${kind}/baru`} className="rounded-xl border border-border p-5 hover:border-orange-500"><h3 className="font-semibold text-foreground">{title} ↗</h3><p className="mt-2 text-sm leading-relaxed text-foreground/60">{description}</p></Link>)}</div></section>
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900"><strong>Simulasi pembayaran.</strong> Donasi baru berstatus menunggu. Buka <Link href="/admin/sarsip/transaksi" className="underline">Transaksi donasi</Link> untuk menandai lunas atau gagal. Tidak ada transfer uang nyata.</div>
  </div>;
}

