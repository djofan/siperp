import { prisma } from "@/lib/prisma";

export async function getDashboardCounts() {
  const [programCount, publishedNewsCount, penyaluranCount, laporanCount] = await Promise.all([
    prisma.sipProgramBantuan.count(),
    prisma.sipNews.count({ where: { status: "published" } }),
    prisma.sipPenyaluranBantuan.count(),
    prisma.sipLaporan.count(),
  ]);

  return { programCount, publishedNewsCount, penyaluranCount, laporanCount };
}

export async function getRecentPenyaluranBantuan(limit = 5) {
  return prisma.sipPenyaluranBantuan.findMany({ orderBy: { date: "desc" }, take: limit });
}
