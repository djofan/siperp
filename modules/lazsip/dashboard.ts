import { prisma } from "@/lib/prisma";

function startOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function startOfLastMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() - 1, 1);
}

export async function getThisMonthTotals() {
  const since = startOfCurrentMonth();
  const lastMonthSince = startOfLastMonth();
  const thisMonthEnd = since;

  const [donationSum, zakatSum, lastMonthDonationSum, lastMonthZakatSum] = await Promise.all([
    prisma.lazsipDonation.aggregate({ where: { status: "paid", createdAt: { gte: since } }, _sum: { amount: true } }),
    prisma.lazsipZakatPayment.aggregate({ where: { status: "paid", createdAt: { gte: since } }, _sum: { amount: true } }),
    prisma.lazsipDonation.aggregate({
      where: { status: "paid", createdAt: { gte: lastMonthSince, lt: thisMonthEnd } },
      _sum: { amount: true },
    }),
    prisma.lazsipZakatPayment.aggregate({
      where: { status: "paid", createdAt: { gte: lastMonthSince, lt: thisMonthEnd } },
      _sum: { amount: true },
    }),
  ]);

  return {
    donations: donationSum._sum.amount ?? 0,
    zakat: zakatSum._sum.amount ?? 0,
    lastMonthDonations: lastMonthDonationSum._sum.amount ?? 0,
    lastMonthZakat: lastMonthZakatSum._sum.amount ?? 0,
  };
}

export async function getTopCampaigns(limit = 5) {
  return prisma.lazsipCampaign.findMany({
    where: { status: "active" },
    orderBy: { currentAmount: "desc" },
    take: limit,
  });
}

export async function getRecentTransactions(limit = 10) {
  const [donations, zakatPayments] = await Promise.all([
    prisma.lazsipDonation.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      include: { campaign: { select: { title: true } } },
    }),
    prisma.lazsipZakatPayment.findMany({ take: limit, orderBy: { createdAt: "desc" } }),
  ]);

  const merged = [
    ...donations.map((d) => ({
      id: d.id,
      label: `Donasi — ${d.campaign.title}`,
      donorName: d.donorName,
      amount: d.amount + d.adminFee,
      status: d.status,
      createdAt: d.createdAt,
    })),
    ...zakatPayments.map((z) => ({
      id: z.id,
      label: "Zakat",
      donorName: z.donorName,
      amount: z.amount,
      status: z.status,
      createdAt: z.createdAt,
    })),
  ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  return merged.slice(0, limit);
}

export async function countNewApplicants() {
  return prisma.lazsipProgramApplicant.count({ where: { status: "baru" } });
}

export async function getDashboardCounts() {
  const [activeCampaigns, totalBeneficiaries, totalPartners, pendingDonations, pendingZakat, donorNames, muzakkiNames] =
    await Promise.all([
      prisma.lazsipCampaign.count({ where: { status: "active" } }),
      prisma.lazsipBeneficiary.count(),
      prisma.lazsipPartner.count(),
      prisma.lazsipDonation.count({ where: { status: "pending" } }),
      prisma.lazsipZakatPayment.count({ where: { status: "pending" } }),
      prisma.lazsipDonation.findMany({ where: { status: "paid" }, select: { donorName: true }, distinct: ["donorName"] }),
      prisma.lazsipZakatPayment.findMany({ where: { status: "paid" }, select: { donorName: true }, distinct: ["donorName"] }),
    ]);

  const distinctDonors = new Set([...donorNames.map((d) => d.donorName), ...muzakkiNames.map((d) => d.donorName)]);

  return {
    activeCampaigns,
    totalBeneficiaries,
    totalPartners,
    pendingTransactions: pendingDonations + pendingZakat,
    totalDonors: distinctDonors.size,
  };
}

/** Total dana masuk (paid) per hari, 30 hari terakhir — untuk grafik tren sederhana di dashboard. */
export async function getDailyInflow(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const [donations, zakatPayments] = await Promise.all([
    prisma.lazsipDonation.findMany({
      where: { status: "paid", createdAt: { gte: since } },
      select: { amount: true, createdAt: true },
    }),
    prisma.lazsipZakatPayment.findMany({
      where: { status: "paid", createdAt: { gte: since } },
      select: { amount: true, createdAt: true },
    }),
  ]);

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const day = new Date(since);
    day.setDate(day.getDate() + i);
    buckets.set(day.toISOString().slice(0, 10), 0);
  }

  for (const row of [...donations, ...zakatPayments]) {
    const key = row.createdAt.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + row.amount);
  }

  return Array.from(buckets.entries()).map(([date, total]) => ({ date, total }));
}
