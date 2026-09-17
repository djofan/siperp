import { prisma } from "@/lib/prisma";

export async function listPenyaluranBantuan() {
  return prisma.sipPenyaluranBantuan.findMany({ orderBy: { date: "desc" } });
}

export async function getPenyaluranBantuanById(id: string) {
  return prisma.sipPenyaluranBantuan.findUnique({ where: { id } });
}

interface PenyaluranBantuanInput {
  title: string;
  description: string;
  image?: string;
  location?: string;
  date: Date;
}

export async function createPenyaluranBantuan(input: PenyaluranBantuanInput) {
  return prisma.sipPenyaluranBantuan.create({ data: input });
}

export async function updatePenyaluranBantuan(id: string, input: PenyaluranBantuanInput) {
  return prisma.sipPenyaluranBantuan.update({ where: { id }, data: input });
}

export async function deletePenyaluranBantuan(id: string) {
  await prisma.sipPenyaluranBantuan.delete({ where: { id } });
}
