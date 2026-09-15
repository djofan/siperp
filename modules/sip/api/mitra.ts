import { prisma } from "@/lib/prisma";

export async function listMitra() {
  return prisma.sipMitra.findMany({ orderBy: { name: "asc" } });
}

export async function getMitraById(id: string) {
  return prisma.sipMitra.findUnique({ where: { id } });
}

interface MitraInput {
  name: string;
  logo?: string;
  url?: string;
}

export async function createMitra(input: MitraInput) {
  return prisma.sipMitra.create({ data: input });
}

export async function updateMitra(id: string, input: MitraInput) {
  return prisma.sipMitra.update({ where: { id }, data: input });
}

export async function deleteMitra(id: string) {
  await prisma.sipMitra.delete({ where: { id } });
}
