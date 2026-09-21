import { prisma } from "@/lib/prisma";

export async function listCampaigns() {
  const campaigns = await prisma.lazsipCampaign.findMany({
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { donations: { where: { status: "paid" } } } } },
  });

  return campaigns.map((c) => ({ ...c, donorCount: c._count.donations }));
}

export async function getCampaignById(id: string) {
  return prisma.lazsipCampaign.findUnique({ where: { id } });
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
