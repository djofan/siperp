import { prisma } from "@/lib/prisma";

export async function listCampaigns() {
  const campaigns = await prisma.lazsipCampaign.findMany({
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });
  const totals = await getCampaignPaidTotals(campaigns.map((c) => c.id));
  return campaigns.map((c) => ({ ...c, currentAmount: totals.get(c.id) ?? 0 }));
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
