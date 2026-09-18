import { prisma } from "@/lib/prisma";

export interface DonorSummary {
  id: string;
  name: string;
  phone: string | null;
  types: ("infaq" | "zakat")[];
  totalContribution: number;
  contributionCount: number;
  lastContributionAt: Date;
}

/** Admin only: one row per identity, including donors whose first payment is pending. */
export async function listDonors(): Promise<DonorSummary[]> {
  const donors = await prisma.paymentDonor.findMany({
    where: { OR: [
      { transactions: { some: { moduleSource: "lazsip" } } },
      { donations: { some: {} } },
      { zakatPayments: { some: {} } },
    ] },
    include: {
      transactions: { where: { moduleSource: "lazsip" }, select: { fundType: true, amount: true, status: true, createdAt: true } },
      donations: { select: { amount: true, status: true, createdAt: true } },
      zakatPayments: { select: { amount: true, status: true, createdAt: true } },
    },
  });
  return donors.map((d) => {
    const payments = [...d.transactions, ...d.donations, ...d.zakatPayments];
    const types: DonorSummary["types"] = [];
    if (d.donations.length || d.transactions.some((t) => t.fundType !== "zakat")) types.push("infaq");
    if (d.zakatPayments.length || d.transactions.some((t) => t.fundType === "zakat")) types.push("zakat");
    return {
      id: d.id, name: d.name, phone: d.phone, types,
      totalContribution: payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0),
      contributionCount: payments.length,
      lastContributionAt: new Date(Math.max(...payments.map((p) => p.createdAt.getTime()))),
    };
  }).sort((a, b) => b.totalContribution - a.totalContribution);
}

export async function getTotalDonationsPaid() {
  const [legacy, payments] = await Promise.all([
    prisma.lazsipDonation.aggregate({ where: { status: "paid" }, _sum: { amount: true } }),
    prisma.paymentTransaction.aggregate({
      where: { moduleSource: "lazsip", sourceType: "campaign", status: "paid" }, _sum: { amount: true },
    }),
  ]);
  return (legacy._sum.amount ?? 0) + (payments._sum.amount ?? 0);
}

export async function getTotalZakatPaid() {
  const result = await prisma.lazsipZakatPayment.aggregate({
    where: { status: "paid" }, _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}
