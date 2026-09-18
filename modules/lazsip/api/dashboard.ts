import { prisma } from "@/lib/prisma";
import { listCampaigns } from "@/modules/lazsip/api/campaigns";
import { listDonationsForAdmin, listPaymentDonationsForAdmin } from "@/modules/lazsip/api/donations";
import { listZakatPaymentsForAdmin } from "@/modules/lazsip/api/zakat";

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

  const [donationSum, zakatSum, lastMonthDonationSum, lastMonthZakatSum, paymentSum, lastMonthPaymentSum] = await Promise.all([
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
    prisma.paymentTransaction.aggregate({
      where: { moduleSource: "lazsip", sourceType: "campaign", status: "paid", createdAt: { gte: since } }, _sum: { amount: true },
    }),
    prisma.paymentTransaction.aggregate({
      where: { moduleSource: "lazsip", sourceType: "campaign", status: "paid", createdAt: { gte: lastMonthSince, lt: thisMonthEnd } }, _sum: { amount: true },
    }),
  ]);

  return {
    donations: (donationSum._sum.amount ?? 0) + (paymentSum._sum.amount ?? 0),
    zakat: zakatSum._sum.amount ?? 0,
    lastMonthDonations: (lastMonthDonationSum._sum.amount ?? 0) + (lastMonthPaymentSum._sum.amount ?? 0),
    lastMonthZakat: lastMonthZakatSum._sum.amount ?? 0,
  };
}

export async function getTopCampaigns(limit = 5) {
  const campaigns = await listCampaigns();
  return campaigns.filter((c) => c.status === "active").sort((a, b) => b.currentAmount - a.currentAmount).slice(0, limit);
}

export async function getRecentTransactions(limit = 10) {
  const [donations, paymentDonations, zakatPayments] = await Promise.all([
    listDonationsForAdmin(), listPaymentDonationsForAdmin(), listZakatPaymentsForAdmin(),
  ]);

  const merged = [
    ...[...donations, ...paymentDonations].map((d) => ({
      id: d.id,
      label: `Donasi — ${d.campaign.title}`,
      donorName: d.donorName,
      amount: d.amount + d.adminFee,
      status: d.status,
      createdAt: d.createdAt,
    })),
    ...zakatPayments.map((z) => ({
      id: z.id,
      label: z.zakatType === "fitrah" ? "Zakat Fitrah" : "Zakat Maal",
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
  const [activeCampaigns, totalBeneficiaries, totalPartners, pendingDonations, pendingZakat, pendingPayments, totalDonors] =
    await Promise.all([
      prisma.lazsipCampaign.count({ where: { status: "active" } }),
      prisma.lazsipBeneficiary.count(),
      prisma.lazsipPartner.count(),
      prisma.lazsipDonation.count({ where: { status: "pending" } }),
      prisma.lazsipZakatPayment.count({ where: { status: "pending" } }),
      prisma.paymentTransaction.count({ where: { moduleSource: "lazsip", status: "pending" } }),
      prisma.paymentDonor.count({ where: { OR: [
        { transactions: { some: { moduleSource: "lazsip" } } },
        { donations: { some: {} } }, { zakatPayments: { some: {} } },
      ] } }),
    ]);

  return {
    activeCampaigns,
    totalBeneficiaries,
    totalPartners,
    pendingTransactions: pendingDonations + pendingZakat + pendingPayments,
    totalDonors,
  };
}

/** Total dana masuk (paid) per hari, 30 hari terakhir — untuk grafik tren sederhana di dashboard. */
export async function getDailyInflow(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const [donations, zakatPayments, payments] = await Promise.all([
    prisma.lazsipDonation.findMany({
      where: { status: "paid", createdAt: { gte: since } },
      select: { amount: true, createdAt: true },
    }),
    prisma.lazsipZakatPayment.findMany({
      where: { status: "paid", createdAt: { gte: since } },
      select: { amount: true, createdAt: true },
    }),
    prisma.paymentTransaction.findMany({
      where: { moduleSource: "lazsip", sourceType: "campaign", status: "paid", createdAt: { gte: since } },
      select: { amount: true, createdAt: true },
    }),
  ]);

  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const day = new Date(since);
    day.setDate(day.getDate() + i);
    buckets.set(day.toISOString().slice(0, 10), 0);
  }

  for (const row of [...donations, ...zakatPayments, ...payments]) {
    const key = row.createdAt.toISOString().slice(0, 10);
    buckets.set(key, (buckets.get(key) ?? 0) + row.amount);
  }

  return Array.from(buckets.entries()).map(([date, total]) => ({ date, total }));
}
