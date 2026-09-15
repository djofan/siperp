import { prisma } from "@/lib/prisma";

export async function listKegiatan() {
  return prisma.sipKegiatanTerkini.findMany({ orderBy: { date: "desc" } });
}

export async function getKegiatanById(id: string) {
  return prisma.sipKegiatanTerkini.findUnique({ where: { id } });
}

interface KegiatanInput {
  title: string;
  description: string;
  image?: string;
  date: Date;
}

export async function createKegiatan(input: KegiatanInput) {
  return prisma.sipKegiatanTerkini.create({ data: input });
}

export async function updateKegiatan(id: string, input: KegiatanInput) {
  return prisma.sipKegiatanTerkini.update({ where: { id }, data: input });
}

export async function deleteKegiatan(id: string) {
  await prisma.sipKegiatanTerkini.delete({ where: { id } });
}
