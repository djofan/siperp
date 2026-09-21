import { prisma } from "@/lib/prisma";

export interface DonorSummary {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  types: ("infaq" | "zakat")[];
  totalContribution: number;
  contributionCount: number;
  lastContributionAt: Date;
}

const DONOR_INCLUDE = {
  transactions: { where: { moduleSource: "lazsip" as const }, select: { fundType: true, amount: true, status: true, createdAt: true } },
  donations: { select: { amount: true, status: true, createdAt: true } },
  zakatPayments: { select: { amount: true, status: true, createdAt: true } },
};

type DonorWithPayments = { id: string; name: string; phone: string | null; email: string | null } & {
  transactions: { fundType: string; amount: number; status: string; createdAt: Date }[];
  donations: { amount: number; status: string; createdAt: Date }[];
  zakatPayments: { amount: number; status: string; createdAt: Date }[];
};

function summarizeDonor(d: DonorWithPayments): DonorSummary {
  const payments = [...d.transactions, ...d.donations, ...d.zakatPayments];
  const types: DonorSummary["types"] = [];
  if (d.donations.length || d.transactions.some((t) => t.fundType !== "zakat")) types.push("infaq");
  if (d.zakatPayments.length || d.transactions.some((t) => t.fundType === "zakat")) types.push("zakat");
  return {
    id: d.id, name: d.name, phone: d.phone, email: d.email, types,
    totalContribution: payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0),
    contributionCount: payments.length,
    lastContributionAt: new Date(Math.max(...payments.map((p) => p.createdAt.getTime()))),
  };
}

/** Admin only: one row per identity, including donors whose first payment is pending. */
export async function listDonors(): Promise<DonorSummary[]> {
  const donors = await prisma.paymentDonor.findMany({
    where: { OR: [
      { transactions: { some: { moduleSource: "lazsip" } } },
      { donations: { some: {} } },
      { zakatPayments: { some: {} } },
    ] },
    include: DONOR_INCLUDE,
  });
  return donors.map(summarizeDonor).sort((a, b) => b.totalContribution - a.totalContribution);
}

export async function getDonorSummaryById(id: string): Promise<DonorSummary | null> {
  const donor = await prisma.paymentDonor.findUnique({ where: { id }, include: DONOR_INCLUDE });
  return donor ? summarizeDonor(donor) : null;
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
  const [legacy, payments] = await Promise.all([
    prisma.lazsipZakatPayment.aggregate({ where: { status: "paid" }, _sum: { amount: true } }),
    prisma.paymentTransaction.aggregate({
      where: { moduleSource: "lazsip", sourceType: "zakat", status: "paid" }, _sum: { amount: true },
    }),
  ]);
  return (legacy._sum.amount ?? 0) + (payments._sum.amount ?? 0);
}
