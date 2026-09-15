import { prisma } from "@/lib/prisma";

export async function listPartners() {
  return prisma.lazsipPartner.findMany({ orderBy: { name: "asc" } });
}

export async function getPartnerById(id: string) {
  return prisma.lazsipPartner.findUnique({ where: { id } });
}

interface PartnerInput {
  name: string;
  logo?: string;
  url?: string;
}

export async function createPartner(input: PartnerInput) {
  return prisma.lazsipPartner.create({ data: input });
}

export async function updatePartner(id: string, input: PartnerInput) {
  return prisma.lazsipPartner.update({ where: { id }, data: input });
}

export async function deletePartner(id: string) {
  await prisma.lazsipPartner.delete({ where: { id } });
}
