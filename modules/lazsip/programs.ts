import { prisma } from "@/lib/prisma";

export async function listPrograms() {
  return prisma.lazsipProgram.findMany({
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });
}

export async function listProgramsByCategory(category: string) {
  return prisma.lazsipProgram.findMany({
    where: { category },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });
}

export async function getProgramById(id: string) {
  return prisma.lazsipProgram.findUnique({ where: { id } });
}

interface ProgramInput {
  title: string;
  description: string;
  requirements?: string;
  image?: string;
  category: string;
  isPinned: boolean;
}

export async function createProgram(input: ProgramInput) {
  return prisma.lazsipProgram.create({ data: input });
}

export async function updateProgram(id: string, input: ProgramInput) {
  return prisma.lazsipProgram.update({ where: { id }, data: input });
}

export async function deleteProgram(id: string) {
  await prisma.lazsipProgram.delete({ where: { id } });
}

export async function setProgramRegistrationOpen(id: string, registrationOpen: boolean) {
  await prisma.lazsipProgram.update({ where: { id }, data: { registrationOpen } });
}
