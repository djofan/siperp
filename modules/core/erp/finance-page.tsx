import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/PageHeader";
import { requireSuperadmin } from "./access";
import { ActionForm } from "./ActionForm";
import { createExpense, importBankLines, matchBankLine, unmatchBankLine } from "./finance-actions";
import { bankDate } from "./policy";
const input = "w-full rounded-lg border border-border bg-surface p-2 text-sm";
const rp = (n: number) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
type PaymentCandidate = { id: string; trackingCode: string; amount: number; adminFee: number; destinationAccountId: string; paidAt: Date | null };
export default async function FinancePage({ searchParams }: { searchParams: Promise<{ account?: string; from?: string; to?: string; page?: string; status?: string }> }) {
  await requireSuperadmin();
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1") || 1);
  const now = new Date();
  const from = params.from ?? new Date(now.getTime()+7*3600000).toISOString().slice(0,7)+"-01", to = params.to ?? new Date(now.getTime()+7*3600000).toISOString().slice(0,10);
  let start: Date, end: Date;
  try { start = bankDate(from); end = new Date(bankDate(to).getTime()+86400000); if (end <= start) throw new Error(); }
  catch { return <div><PageHeader title="Keuangan" description="Rentang tanggal tidak valid." /><Link href="/admin/super/keuangan">Reset filter</Link></div>; }
  const accounts = await prisma.paymentDestinationAccount.findMany({ orderBy: [{ moduleSource: "asc" }, { fundType: "asc" }] });
  const accountFilter = params.account ? { accountId: params.account } : {};
  const paymentFilter = params.account ? { destinationAccountId: params.account } : {};
  const lineWhere = { ...accountFilter, bookedAt: { gte: start, lt: end }, ...(params.status === "unmatched" ? { paymentId: null, expenseId: null } : {}) };
  const [income, expenseSum, lines, count, expenses] = await Promise.all([
    prisma.paymentTransaction.groupBy({ by: ["destinationAccountId", "moduleSource", "fundType"], where: { ...paymentFilter, status: "paid", gateway: { notIn: ["simulation", "midtrans_sandbox"] }, paidAt: { gte: start, lt: end } }, _sum: { amount: true, adminFee: true } }),
    prisma.coreExpense.groupBy({ by: ["accountId", "moduleSource", "fundType"], where: { ...accountFilter, spentAt: { gte: start, lt: end } }, _sum: { amount: true } }),
    prisma.coreBankLine.findMany({ where: lineWhere, orderBy: [{ bookedAt: "desc" }, { id: "asc" }], skip: (page-1)*20, take: 20 }),
    prisma.coreBankLine.count({ where: lineWhere }),
    prisma.coreExpense.findMany({ where: { ...accountFilter, spentAt: { gte: start, lt: end } }, orderBy: { spentAt: "desc" }, take: 30 }),
  ]);
  const [paymentGroups, candidatesExpenses] = await Promise.all([
    Promise.all(lines.filter(l => l.direction === "masuk" && !l.paymentId).map(l => prisma.$queryRaw<PaymentCandidate[]>`
      SELECT p.id, p.tracking_code AS trackingCode, p.amount, p.admin_fee AS adminFee, p.destination_account_id AS destinationAccountId, p.paid_at AS paidAt
      FROM payment_transactions p WHERE p.status='paid' AND p.gateway NOT IN ('simulation','midtrans_sandbox')
      AND p.destination_account_id=${l.accountId} AND p.amount+p.admin_fee=${l.amount}
      AND NOT EXISTS (SELECT 1 FROM core_bank_lines b WHERE b.payment_id=p.id)
      ORDER BY ABS(TIMESTAMPDIFF(DAY,p.paid_at,${l.bookedAt})), p.id LIMIT 100`)),
    prisma.coreExpense.findMany({ where: { bankLine: null, OR: lines.filter(l => l.direction === "keluar" && !l.expenseId).map(l => ({ accountId: l.accountId, amount: l.amount })) }, take: 1000 }),
  ]);
  const payments = [...new Map(paymentGroups.flat().map(p => [p.id, p])).values()];
  const summary = accounts.filter(a => !params.account || a.id === params.account).map(a => { const i = income.find(v => v.destinationAccountId === a.id), e = expenseSum.find(v => v.accountId === a.id); return { account: a, income: i?._sum.amount ?? 0, fees: i?._sum.adminFee ?? 0, expense: e?._sum.amount ?? 0 }; });
  const selector = <select required name="accountId" className={input}><option value="">Pilih rekening</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.moduleSource} / {a.fundType} · {a.bankName} {a.accountNumber}</option>)}</select>;
  const query = new URLSearchParams({ account: params.account ?? "", from, to, status: params.status ?? "" });
  return <div className="space-y-6"><PageHeader title="Keuangan & Rekonsiliasi" description="Penerimaan nyata dan pengeluaran ERP per rekening serta jenis dana. Pembayaran simulasi dan sandbox tidak dihitung." />
    <form className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-5"><label>Rekening<select name="account" defaultValue={params.account} className={input}><option value="">Semua rekening</option>{accounts.map(a => <option key={a.id} value={a.id}>{a.moduleSource}/{a.fundType} {a.bankName} {a.accountNumber}</option>)}</select></label><label>Dari<input type="date" name="from" defaultValue={from} className={input} /></label><label>Sampai<input type="date" name="to" defaultValue={to} className={input} /></label><label>Mutasi<select name="status" defaultValue={params.status} className={input}><option value="">Semua</option><option value="unmatched">Belum cocok</option></select></label><button className="rounded-lg border">Terapkan</button></form>
    <div className="overflow-x-auto rounded-xl border border-border bg-surface"><table className="w-full text-left text-sm"><thead><tr>{["Rekening / dana", "Penerimaan dana", "Biaya admin diterima", "Pengeluaran tercatat", "Arus bersih periode"].map(h => <th key={h} className="p-3">{h}</th>)}</tr></thead><tbody>{summary.map(s => <tr key={s.account.id} className="border-t border-border"><td className="p-3">{s.account.moduleSource} / {s.account.fundType}<br />{s.account.bankName} {s.account.accountNumber}</td><td className="p-3">{rp(s.income)}</td><td className="p-3">{rp(s.fees)}</td><td className="p-3">{rp(s.expense)}</td><td className="p-3">{rp(s.income+s.fees-s.expense)}</td></tr>)}</tbody></table></div><p className="text-sm text-foreground/60">Arus bersih periode belum mencakup saldo awal. Catatan bantuan modul bukan bukti pengeluaran bank; catat pengeluarannya sekali dengan referensi bukti unik. Nominal rekonsiliasi penerimaan menggunakan dana + biaya admin. Jika settlement gateway dipotong atau digabung, mutasi tetap belum cocok sampai bukti dan pencatatan disesuaikan.</p>
    <div className="grid gap-5 lg:grid-cols-2"><section className="rounded-xl border border-border bg-surface p-5"><h2 className="mb-3 font-semibold">Catat pengeluaran</h2><ActionForm action={createExpense} button="Simpan pengeluaran">{selector}<label className="block">Tanggal<input required type="date" name="spentAt" className={input} /></label><label className="block">Nominal rupiah<input required type="number" name="amount" min="1" max="2147483647" step="1" className={input} /></label><label className="block">Referensi bukti unik<input required name="reference" maxLength={191} className={input} /></label><label className="block">Keterangan<textarea required name="description" className={input} /></label></ActionForm></section>
    <section className="rounded-xl border border-border bg-surface p-5"><h2 className="mb-3 font-semibold">Impor mutasi bank</h2><p className="mb-3 text-sm">CSV maksimal 1 MB / 1.000 baris. Tanggal YYYY-MM-DD, arah masuk/keluar, nominal rupiah bulat. Referensi harus membedakan setiap transaksi bank.</p><a className="mb-3 inline-block underline" href="/api/super/erp/export?type=bank-template">Unduh template CSV</a><ActionForm action={importBankLines} button="Impor mutasi">{selector}<input required type="file" name="file" accept=".csv,text/csv" className={input} /></ActionForm></section></div>
    <section><h2 className="mb-3 font-semibold">Rekonsiliasi · {count} mutasi</h2><div className="space-y-3">{lines.map(l => {
      const choices = l.direction === "masuk" ? payments.filter(p => p.destinationAccountId === l.accountId && p.amount+p.adminFee === l.amount).map(p => ({ id: p.id, label: `${p.trackingCode} · ${p.paidAt?.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })}` })) : candidatesExpenses.filter(e => e.accountId === l.accountId && e.amount === l.amount).map(e => ({ id: e.id, label: `${e.reference} · ${e.spentAt.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })}` }));
      return <article key={l.id} className="rounded-xl border border-border bg-surface p-4"><p className="font-medium">{l.bookedAt.toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta" })} · {l.reference} · {l.direction} {rp(l.amount)}</p><p className="mb-2 text-sm">{l.description} · {accounts.find(a => a.id === l.accountId)?.bankName}</p>{l.paymentId || l.expenseId ? <><p className="mb-2 text-sm text-emerald-700">Cocok · {l.matchNote}</p><details><summary className="text-sm">Batalkan pencocokan</summary><ActionForm action={unmatchBankLine} button="Batalkan"><input type="hidden" name="lineId" value={l.id} /><input required name="note" placeholder="Alasan pembatalan" className={input} /></ActionForm></details></> : choices.length ? <ActionForm action={matchBankLine} button="Konfirmasi cocok"><input type="hidden" name="lineId" value={l.id} /><select required name="entryId" className={input}><option value="">Pilih bukti transaksi setelah verifikasi tanggal/referensi</option>{choices.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select><input required name="note" placeholder="Catatan verifikasi bukti" className={input} /></ActionForm> : <p className="text-sm text-amber-700">Belum cocok · tidak ada transaksi tersedia dengan rekening dan nominal yang sama.</p>}</article>;
    })}{!lines.length && <p className="p-4">Belum ada mutasi pada filter ini.</p>}</div><div className="mt-4 flex gap-4">{page > 1 && <Link href={`?${query}&page=${page-1}`}>Sebelumnya</Link>}{page*20 < count && <Link href={`?${query}&page=${page+1}`}>Berikutnya</Link>}</div></section>
    <section className="rounded-xl border border-border bg-surface p-5"><h2 className="font-semibold">Pengeluaran terbaru pada periode ini</h2>{expenses.map(e => <p key={e.id} className="border-b border-border py-3 text-sm">{e.reference} · {e.moduleSource}/{e.fundType} · {rp(e.amount)} · {e.description}</p>)}{!expenses.length && <p className="py-3 text-sm">Belum ada pengeluaran tercatat.</p>}</section>
    <a href={`/api/super/erp/export?type=finance&${query}`} className="inline-block underline">Ekspor laporan CSV periode ini</a>
  </div>;
}
