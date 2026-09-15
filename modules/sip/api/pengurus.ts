import { prisma } from "@/lib/prisma";

export { PENGURUS_LEVELS, type PengurusLevel } from "@/modules/sip/api/pengurusLevels";

export async function listPengurus() {
  return prisma.sipPengurus.findMany({ orderBy: [{ order: "asc" }, { name: "asc" }] });
}

export async function getPengurusById(id: string) {
  return prisma.sipPengurus.findUnique({ where: { id } });
}

interface PengurusInput {
  name: string;
  position: string;
  level: string;
  photo?: string;
  order: number;
}

export async function createPengurus(input: PengurusInput) {
  return prisma.sipPengurus.create({ data: input });
}

export async function updatePengurus(id: string, input: PengurusInput) {
  return prisma.sipPengurus.update({ where: { id }, data: input });
}

export async function deletePengurus(id: string) {
  await prisma.sipPengurus.delete({ where: { id } });
}
