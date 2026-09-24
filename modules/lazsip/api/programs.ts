import { prisma } from "@/lib/prisma";

export async function listPrograms() {
  const programs = await prisma.lazsipProgram.findMany({
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });
  // Keep the admin/public row contract stable when Prisma's merged module client
  // contains a legacy program shape without the newer `type` field.
  return programs.map((program) => ({
    ...program,
    type: "type" in program && typeof program.type === "string" ? program.type : "berita",
  }));
}

export async function listProgramsByType(type: string) {
  const programs = await prisma.lazsipProgram.findMany({
    // Some generated client variants predate `type`; the database query remains valid
    // against the current schema, so keep this compatibility cast local to the filter.
    where: { type } as never,
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
  });
  return programs.map((program) => ({
    ...program,
    type: "type" in program && typeof program.type === "string" ? program.type : "berita",
  }));
}

export async function getProgramById(id: string) {
  return prisma.lazsipProgram.findUnique({ where: { id } });
}

interface ProgramInput {
  title: string;
  description: string;
  requirements?: string | null;
  image?: string;
  category?: string;
  type: string;
  formUrl?: string | null;
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
