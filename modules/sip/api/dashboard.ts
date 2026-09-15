import { prisma } from "@/lib/prisma";

export async function getDashboardCounts() {
  const [pengurusCount, programCount, publishedBlogCount, kegiatanCount, mitraCount, laporanCount] = await Promise.all([
    prisma.sipPengurus.count(),
    prisma.sipProgramBantuan.count(),
    prisma.sipBlog.count({ where: { status: "published" } }),
    prisma.sipKegiatanTerkini.count(),
    prisma.sipMitra.count(),
    prisma.sipLaporan.count(),
  ]);

  return { pengurusCount, programCount, publishedBlogCount, kegiatanCount, mitraCount, laporanCount };
}

export async function getRecentKegiatan(limit = 5) {
  return prisma.sipKegiatanTerkini.findMany({ orderBy: { date: "desc" }, take: limit });
}
