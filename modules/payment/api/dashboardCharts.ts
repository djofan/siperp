import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { dayKey, summarizeCharts, type ChartRow } from "./chartData";

export const getDashboardCharts = cache(async (moduleSource: "lazsip" | "sarsip") => {
  const now = new Date();
  const since = new Date(new Date(`${dayKey(now)}T00:00:00+07:00`).getTime() - 89 * 86400000);
  const payments = await prisma.paymentTransaction.findMany({
    where: { moduleSource, OR: [{ paidAt: { gte: since } }, { paidAt: null, createdAt: { gte: since } }] },
    select: { donorId: true, amount: true, status: true, fundType: true, createdAt: true, paidAt: true },
  });
  const rows: ChartRow[] = payments.map(p => ({ ...p, date: p.paidAt ?? p.createdAt }));
  if (moduleSource === "lazsip") {
    const [donations, zakat] = await Promise.all([
      prisma.lazsipDonation.findMany({ where: { createdAt: { gte: since } }, select: { donorId: true, amount: true, status: true, createdAt: true } }),
      prisma.lazsipZakatPayment.findMany({ where: { createdAt: { gte: since } }, select: { donorId: true, amount: true, status: true, createdAt: true } }),
    ]);
    rows.push(...donations.map(p => ({ ...p, fundType: "infak", date: p.createdAt })), ...zakat.map(p => ({ ...p, fundType: "zakat", date: p.createdAt })));
  }
  const month = dayKey(now).slice(0, 7);
  const previousMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)) - 2, 1)).toISOString().slice(0, 7);
  const totals = { donations: 0, zakat: 0, lastMonthDonations: 0, lastMonthZakat: 0 };
  for (const row of rows) {
    if (row.status !== "paid" || row.date > now) continue;
    const key = dayKey(row.date).slice(0, 7);
    if (key === month) totals[row.fundType === "zakat" ? "zakat" : "donations"] += row.amount;
    if (key === previousMonth) totals[row.fundType === "zakat" ? "lastMonthZakat" : "lastMonthDonations"] += row.amount;
  }
  return { totals, periods: [7, 30, 90].map(days => summarizeCharts(rows, days, now)) };
});
