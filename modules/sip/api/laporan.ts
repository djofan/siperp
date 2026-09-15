import { prisma } from "@/lib/prisma";

export async function listLaporan(type?: "bulanan" | "tahunan") {
  return prisma.sipLaporan.findMany({
    where: type ? { type } : undefined,
    orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
  });
}

export async function getLaporanById(id: string) {
  return prisma.sipLaporan.findUnique({ where: { id } });
}

interface LaporanInput {
  title: string;
  type: "bulanan" | "tahunan";
  periodMonth?: number;
  periodYear: number;
  fileUrl: string;
}

export async function createLaporan(input: LaporanInput) {
  return prisma.sipLaporan.create({
    data: { ...input, periodMonth: input.type === "bulanan" ? input.periodMonth : null },
  });
}

export async function updateLaporan(id: string, input: LaporanInput) {
  return prisma.sipLaporan.update({
    where: { id },
    data: { ...input, periodMonth: input.type === "bulanan" ? input.periodMonth : null },
  });
}

export async function deleteLaporan(id: string) {
  await prisma.sipLaporan.delete({ where: { id } });
}
