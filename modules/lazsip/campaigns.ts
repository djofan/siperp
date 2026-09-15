import { prisma } from "@/lib/prisma";

export async function listCampaigns() {
  return prisma.lazsipCampaign.findMany({
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });
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
