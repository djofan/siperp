import { prisma } from "@/lib/prisma";

export { slugify } from "@/modules/sip/api/slugify";

export async function listProgramBantuan() {
  return prisma.sipProgramBantuan.findMany({ orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }] });
}

export async function getProgramBantuanById(id: string) {
  return prisma.sipProgramBantuan.findUnique({ where: { id } });
}

export async function getProgramBantuanBySlug(slug: string) {
  return prisma.sipProgramBantuan.findUnique({ where: { slug } });
}

interface ProgramBantuanInput {
  title: string;
  slug: string;
  description: string;
  image?: string;
  campaignUrl?: string;
  isPinned: boolean;
}

export async function createProgramBantuan(input: ProgramBantuanInput) {
  return prisma.sipProgramBantuan.create({ data: input });
}

export async function updateProgramBantuan(id: string, input: ProgramBantuanInput) {
  return prisma.sipProgramBantuan.update({ where: { id }, data: input });
}

export async function deleteProgramBantuan(id: string) {
  await prisma.sipProgramBantuan.delete({ where: { id } });
}
