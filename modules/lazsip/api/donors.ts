import { prisma } from "@/lib/prisma";

/**
 * "Donor" sengaja tidak disimpan sebagai tabel tersendiri (beda dari daftar entitas di
 * docs/prd-lazsip.md §5) — dihitung langsung dari transaksi `paid` supaya tidak ada risiko
 * total kontribusi drift dari sumber aslinya (Donation/ZakatPayment). Donatur di sini
 * diidentifikasi dari donorName, bukan akun terdaftar (donatur tidak login).
 */
export interface DonorSummary {
  name: string;
  type: "infaq" | "zakat";
  totalContribution: number;
  contributionCount: number;
  lastContributionAt: Date;
}

export async function listDonors(): Promise<DonorSummary[]> {
  const [donations, zakatPayments] = await Promise.all([
    prisma.lazsipDonation.groupBy({
      by: ["donorName"],
      where: { status: "paid" },
      _sum: { amount: true },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
    prisma.lazsipZakatPayment.groupBy({
      by: ["donorName"],
      where: { status: "paid" },
      _sum: { amount: true },
      _count: { _all: true },
      _max: { createdAt: true },
    }),
  ]);

  const infaqDonors: DonorSummary[] = donations.map((row) => ({
    name: row.donorName,
    type: "infaq",
    totalContribution: row._sum.amount ?? 0,
    contributionCount: row._count._all,
    lastContributionAt: row._max.createdAt ?? new Date(0),
  }));

  const zakatDonors: DonorSummary[] = zakatPayments.map((row) => ({
    name: row.donorName,
    type: "zakat",
    totalContribution: row._sum.amount ?? 0,
    contributionCount: row._count._all,
    lastContributionAt: row._max.createdAt ?? new Date(0),
  }));

  return [...infaqDonors, ...zakatDonors].sort(
    (a, b) => b.totalContribution - a.totalContribution
  );
}

export async function getTotalDonationsPaid() {
  const result = await prisma.lazsipDonation.aggregate({
    where: { status: "paid" },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

export async function getTotalZakatPaid() {
  const result = await prisma.lazsipZakatPayment.aggregate({
    where: { status: "paid" },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}
