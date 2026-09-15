import { prisma } from "@/lib/prisma";

export async function listApplicants() {
  return prisma.lazsipProgramApplicant.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      contact: true,
      status: true,
      createdAt: true,
      program: { select: { id: true, title: true } },
    },
  });
}

export async function createApplicant(input: { programId: string; name: string; contact: string }) {
  return prisma.lazsipProgramApplicant.create({ data: input });
}

const VALID_STATUSES = ["baru", "diproses", "diterima", "ditolak"];

export async function setApplicantStatus(id: string, status: string) {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error("Status pendaftar tidak valid.");
  }
  await prisma.lazsipProgramApplicant.update({ where: { id }, data: { status } });
}
