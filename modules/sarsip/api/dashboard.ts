import { prisma } from "@/lib/prisma";

export async function getDashboardCounts() {
  const [activeActivities, openCampaigns, totalBeneficiaries, pendingTransactions, totalDonors] =
    await Promise.all([
      prisma.sarsipEntry.count({ where: { kind: "kegiatan", status: { in: ["published", "completed"] } } }),
      prisma.sarsipEntry.count({ where: { kind: "campaign", status: "published" } }),
      prisma.sarsipBeneficiary.count({ where: { archivedAt: null } }),
      prisma.paymentTransaction.count({ where: { moduleSource: "sarsip", status: "pending" } }),
      prisma.paymentTransaction.groupBy({
        by: ["donorId"],
        where: { moduleSource: "sarsip", status: "paid" },
      }).then((groups) => groups.length),
    ]);

  return { activeActivities, openCampaigns, totalBeneficiaries, pendingTransactions, totalDonors };
}

export async function getThisMonthTotals() {
  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const [thisMonth, lastMonth] = await Promise.all([
    prisma.paymentTransaction.aggregate({
      where: { moduleSource: "sarsip", status: "paid", createdAt: { gte: startOfThisMonth } },
      _sum: { amount: true },
    }),
    prisma.paymentTransaction.aggregate({
      where: { moduleSource: "sarsip", status: "paid", createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } },
      _sum: { amount: true },
    }),
  ]);

  return {
    donations: thisMonth._sum.amount ?? 0,
    lastMonthDonations: lastMonth._sum.amount ?? 0,
  };
}

export async function getTopCampaigns(limit: number) {
  const campaigns = await prisma.sarsipEntry.findMany({
    where: { kind: "campaign", status: "published" },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const sums = await prisma.paymentTransaction.groupBy({
    by: ["sourceId"],
    where: { moduleSource: "sarsip", sourceType: "campaign", status: "paid", sourceId: { in: campaigns.map((c) => c.id) } },
    _sum: { amount: true },
  });
  const totals = new Map(sums.map((s) => [s.sourceId, s._sum.amount ?? 0]));

  return campaigns
    .map((c) => ({ id: c.id, title: c.title, targetAmount: c.targetAmount, currentAmount: totals.get(c.id) ?? 0 }))
    .sort((a, b) => b.currentAmount - a.currentAmount)
    .slice(0, limit);
}

export async function getRecentTransactions(limit: number) {
  const rows = await prisma.paymentTransaction.findMany({
    where: { moduleSource: "sarsip" },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { donor: { select: { name: true } } },
  });

  return rows.map((r) => ({
    id: r.id,
    label: `Donasi — ${r.sourceType}`,
    donorName: r.donor.name,
    amount: r.amount,
    status: r.status,
    createdAt: r.createdAt,
  }));
}

export async function getDailyInflow(days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const rows = await prisma.paymentTransaction.findMany({
    where: { moduleSource: "sarsip", status: "paid", createdAt: { gte: since } },
    select: { amount: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  const map = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    map.set(d.toISOString().slice(0, 10), 0);
  }
  for (const r of rows) {
    const key = r.createdAt.toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + r.amount);
  }

  return [...map.entries()].map(([date, total]) => ({ date, total }));
}
