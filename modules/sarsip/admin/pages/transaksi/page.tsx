import Link from "next/link";
import { listAdminTransactions, listEntries, money } from "@/modules/sarsip/api/data";
import { TransactionActions } from "@/modules/lazsip/components/admin/TransactionActions";
export default async function TransactionsPage() {
  const [rows, entries] = await Promise.all([listAdminTransactions(), listEntries("campaign", true)]);
  const titles = new Map(entries.map((e) => [e.id, e.title]));
  const statuses: Record<string,string> = { pending: "Menunggu", paid: "Lunas", failed: "Gagal" };
  return <div><h1 className="text-2xl font-bold text-foreground">Transaksi donasi SARSIP</h1><p className="mb-6 mt-2 text-sm text-foreground/60">Simulasi pembayaran. Hanya transaksi lunas menambah dana campaign; nominal donasi tidak termasuk biaya admin.</p>{rows.length ? <div className="overflow-x-auto rounded-2xl border border-border bg-surface"><table className="w-full min-w-[800px] text-left text-sm text-foreground"><thead><tr className="border-b border-border text-foreground/60">{["Campaign / kode","Donatur","Donasi","Biaya admin","Status","Aksi"].map((h) => <th key={h} className="p-4">{h}</th>)}</tr></thead><tbody>{rows.map((r) => <tr key={r.id} className="border-b border-border last:border-0"><td className="p-4">{titles.get(r.sourceId) ?? "Campaign"}<Link href={`/payment/checkout/${r.id}`} className="mt-1 block font-mono text-xs text-orange-600">{r.id}</Link></td><td className="p-4">{r.donor.name}{r.isAnonymous && <span className="block text-xs text-foreground/50">Anonim di publik</span>}</td><td className="p-4">{money(r.amount)}</td><td className="p-4">{money(r.adminFee)}</td><td className="p-4">{statuses[r.status] ?? r.status}</td><td className="p-4">{r.status === "pending" ? <TransactionActions id={r.id} source="payment"/> : "—"}</td></tr>)}</tbody></table></div> : <p className="rounded-2xl border border-dashed border-border p-8 text-sm text-foreground/60">Belum ada transaksi donasi.</p>}</div>;
}

