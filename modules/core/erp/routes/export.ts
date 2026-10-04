import { getSuperadmin } from "../access";
import { prisma } from "@/lib/prisma";
import { bankDate } from "../policy";
const cell = (v: unknown) => '"' + String(v ?? "").replace(/^\s*[=+\-@]/, "'$&").replace(/"/g, '""') + '"';
const date = (d: Date) => new Date(d.getTime()+7*3600000).toISOString().slice(0,10);
export async function GET(request: Request) {
  if (!await getSuperadmin()) return new Response(null, { status: 403 });
  const query = new URL(request.url).searchParams;
  let rows: unknown[][], filename: string;
  if (query.get("type") === "bank-template") {
    rows = [["tanggal", "referensi", "keterangan", "arah", "nominal"], ["2026-10-02", "BANK-001", "Contoh penerimaan", "masuk", "100000"]]; filename = "template-mutasi.csv";
  } else if (query.get("type") === "finance") {
    try {
      const start = bankDate(query.get("from") ?? ""), end = new Date(bankDate(query.get("to") ?? "").getTime()+86400000);
      if (end <= start) throw new Error();
      const account = query.get("account");
      const [payments, expenses] = await Promise.all([
        prisma.paymentTransaction.findMany({ where: { status: "paid", gateway: { notIn: ["simulation", "midtrans_sandbox"] }, paidAt: { gte: start, lt: end }, ...(account ? { destinationAccountId: account } : {}) }, include: { destinationAccount: true }, take: 10001 }),
        prisma.coreExpense.findMany({ where: { spentAt: { gte: start, lt: end }, ...(account ? { accountId: account } : {}) }, take: 10001 }),
      ]);
      if (payments.length > 10000 || expenses.length > 10000) return Response.json({ error: "Persempit periode ekspor; maksimal 10.000 baris per jenis." }, { status: 400 });
      const accounts = await prisma.paymentDestinationAccount.findMany();
      rows = [["tanggal", "referensi", "modul", "dana", "rekening", "arah", "nominal_dana", "biaya_admin", "total"]];
      payments.forEach(p => rows.push([date(p.paidAt!), p.trackingCode, p.moduleSource, p.fundType, p.destinationAccount.accountNumber, "masuk", p.amount, p.adminFee, p.amount+p.adminFee]));
      expenses.forEach(e => rows.push([date(e.spentAt), e.reference, e.moduleSource, e.fundType, accounts.find(a => a.id === e.accountId)?.accountNumber, "keluar", e.amount, 0, e.amount]));
      filename = "laporan-keuangan.csv";
    } catch { return Response.json({ error: "Filter tanggal tidak valid." }, { status: 400 }); }
  } else return new Response(null, { status: 400 });
  return new Response("\uFEFF" + rows.map(r => r.map(cell).join(",")).join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${filename}"`, "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
}
