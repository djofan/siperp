import { listAdminTransactions, money } from "@/modules/sarsip/api/data";
export default async function DonorsPage() {
  const rows = await listAdminTransactions();
  const donors = new Map<string, { name: string; phone: string | null; count: number; amount: number }>();
  for (const row of rows) {
    const donor = donors.get(row.donor.id) ?? { name: row.donor.name, phone: row.donor.phone, count: 0, amount: 0 };
    donor.count++; if (row.status === "paid") donor.amount += row.amount; donors.set(row.donor.id, donor);
  }
  return <div><h1 className="text-2xl font-bold text-foreground">Data donatur SARSIP</h1><p className="mb-6 mt-2 text-sm text-foreground/60">Identitas untuk pendataan admin. Total lunas hanya dari kontribusi SARSIP, tanpa biaya admin.</p>{donors.size ? <div className="overflow-x-auto rounded-2xl border border-border bg-surface"><table className="w-full min-w-[550px] text-left text-sm text-foreground"><thead><tr className="border-b border-border text-foreground/60">{["Nama","WhatsApp","Jumlah transaksi","Total lunas"].map((h) => <th key={h} className="p-4">{h}</th>)}</tr></thead><tbody>{[...donors].map(([id,d]) => <tr key={id} className="border-b border-border last:border-0"><td className="p-4">{d.name}</td><td className="p-4">{d.phone ? `+${d.phone}` : "Belum tercatat"}</td><td className="p-4">{d.count}</td><td className="p-4">{money(d.amount)}</td></tr>)}</tbody></table></div> : <p className="rounded-2xl border border-dashed border-border p-8 text-sm text-foreground/60">Belum ada data donatur.</p>}</div>;
}

