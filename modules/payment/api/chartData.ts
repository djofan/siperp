export type ChartRow = { donorId: string; amount: number; status: string; fundType: string; date: Date };
export const dayKey = (date: Date) => new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 10);
export function summarizeCharts(rows: ChartRow[], days: number, now = new Date()) {
  const today = dayKey(now);
  const end = new Date(`${today}T00:00:00+07:00`);
  const daily = Array.from({ length: days }, (_, i) => ({ date: dayKey(new Date(end.getTime() - (days - 1 - i) * 86400000)), amount: 0, donors: 0, transactions: 0 }));
  const buckets = new Map(daily.map(d => [d.date, d]));
  const donorsByDay = new Map<string, Set<string>>();
  const donors = new Set<string>();
  const statuses = { paid: 0, pending: 0, failed: 0 };
  const funds = { zakat: 0, donation: 0 };
  for (const row of rows) {
    const key = dayKey(row.date), bucket = buckets.get(key);
    if (!bucket || row.date > now) continue;
    if (row.status === "paid" || row.status === "pending" || row.status === "failed") statuses[row.status]++;
    if (row.status !== "paid") continue;
    bucket.amount += row.amount; bucket.transactions++;
    const set = donorsByDay.get(key) ?? new Set<string>();
    set.add(row.donorId); donorsByDay.set(key, set); bucket.donors = set.size;
    donors.add(row.donorId);
    funds[row.fundType === "zakat" ? "zakat" : "donation"] += row.amount;
  }
  return { days, daily, statuses, funds, amount: funds.zakat + funds.donation, donors: donors.size, transactions: statuses.paid };
}
export type ChartSummary = ReturnType<typeof summarizeCharts>;
