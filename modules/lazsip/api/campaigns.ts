import { prisma } from "@/lib/prisma";

export async function listCampaigns() {
  const campaigns = await prisma.lazsipCampaign.findMany({
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { donations: { where: { status: "paid" } } } } },
  });
  const totals = await getCampaignPaidTotals(campaigns.map((c) => c.id));
  return campaigns.map((c) => ({
    ...c,
    currentAmount: totals.get(c.id) ?? 0,
    donorCount: c._count.donations,
  }));
}

export async function getCampaignById(id: string) {
  const campaign = await prisma.lazsipCampaign.findUnique({ where: { id } });
  if (!campaign) return null;
  const totals = await getCampaignPaidTotals([id]);
  return { ...campaign, currentAmount: totals.get(id) ?? 0 };
}

export async function getCampaignPaidTotals(ids: string[]) {
  const totals = new Map<string, number>();
  if (!ids.length) return totals;
  const [legacy, payments] = await Promise.all([
    prisma.lazsipDonation.groupBy({
      by: ["campaignId"], where: { campaignId: { in: ids }, status: "paid" }, _sum: { amount: true },
    }),
    prisma.paymentTransaction.groupBy({
      by: ["sourceId"],
      where: { moduleSource: "lazsip", sourceType: "campaign", sourceId: { in: ids }, status: "paid" },
      _sum: { amount: true },
    }),
  ]);
  for (const row of legacy) totals.set(row.campaignId, row._sum.amount ?? 0);
  for (const row of payments) totals.set(row.sourceId, (totals.get(row.sourceId) ?? 0) + (row._sum.amount ?? 0));
  return totals;
}

/** Only display names and donation amounts cross the public boundary; never phone or donor ID. */
export async function listCampaignDonorsPublic(campaignId: string) {
  const select = { id: true, amount: true, isAnonymous: true, createdAt: true, donor: { select: { name: true } } } as const;
  const [legacy, payments] = await Promise.all([
    prisma.lazsipDonation.findMany({ where: { campaignId, status: "paid" }, select }),
    prisma.paymentTransaction.findMany({
      where: { moduleSource: "lazsip", sourceType: "campaign", sourceId: campaignId, status: "paid" }, select,
    }),
  ]);
  return [...legacy, ...payments]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((d) => ({ id: d.id, name: d.isAnonymous ? "Hamba Allah" : d.donor.name, amount: d.amount }));
}

interface CampaignInput {
  title: string;
  description: string;
  targetAmount: number;
  image?: string;
  uniqueCode: string;
  isPinned: boolean;
  status: string;
}

export async function createCampaign(input: CampaignInput) {
  return prisma.lazsipCampaign.create({ data: input });
}

export async function updateCampaign(id: string, input: CampaignInput) {
  return prisma.lazsipCampaign.update({ where: { id }, data: input });
}

export async function deleteCampaign(id: string) {
  await prisma.lazsipCampaign.delete({ where: { id } });
}

export interface CampaignHistoryEntry {
  id: string;
  kind: "donasi" | "penyesuaian";
  label: string;
  amount: number;
  createdAt: Date;
}

/**
 * Gabungan donasi `paid` + penyesuaian saldo manual, diurutkan terbaru dulu —
 * satu riwayat lengkap kenapa currentAmount campaign ini bisa jadi segini.
 */
export async function listCampaignHistory(campaignId: string): Promise<CampaignHistoryEntry[]> {
  const [donations, adjustments] = await Promise.all([
    prisma.lazsipDonation.findMany({
      where: { campaignId, status: "paid" },
      orderBy: { createdAt: "desc" },
    }),
    prisma.lazsipCampaignAdjustment.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const entries: CampaignHistoryEntry[] = [
    ...donations.map((d) => ({
      id: d.id,
      kind: "donasi" as const,
      label: d.isAnonymous ? "Donatur (anonim)" : d.donorName,
      amount: d.amount,
      createdAt: d.createdAt,
    })),
    ...adjustments.map((a) => ({
      id: a.id,
      kind: "penyesuaian" as const,
      label: a.note,
      amount: a.amount,
      createdAt: a.createdAt,
    })),
  ];

  return entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Penyesuaian saldo manual oleh admin (mis. donasi tunai/offline) — amount boleh
 * negatif (kurangi saldo). Selalu tercatat sebagai riwayat, currentAmount cuma
 * berubah lewat transaction ini, gak pernah di-overwrite langsung dari form edit.
 */
export async function createCampaignAdjustment(campaignId: string, amount: number, note: string) {
  await prisma.$transaction(async (tx) => {
    await tx.lazsipCampaignAdjustment.create({ data: { campaignId, amount, note } });
    await tx.lazsipCampaign.update({
      where: { id: campaignId },
      data: { currentAmount: { increment: amount } },
    });
  });
}
