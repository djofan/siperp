import { prisma } from "@/lib/prisma";

// Semua perhitungan periode pakai zona WIB, bukan zona server, supaya tahun/bulan
// yang tampil di dashboard sama dengan tanggal yang diinput admin.
const jakartaParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", { year: "numeric", month: "numeric", timeZone: "Asia/Jakarta" }).formatToParts(date);
  return {
    year: Number(parts.find((p) => p.type === "year")?.value),
    month: Number(parts.find((p) => p.type === "month")?.value),
  };
};

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

/** Jumlah penyaluran per tahun, dari tahun pertama ada data sampai tahun ini — tahun kosong tetap muncul (0). */
export async function getPenyaluranPerYear(now = new Date()) {
  const rows = await prisma.sipPenyaluranBantuan.findMany({ select: { date: true } });
  const counts = new Map<number, number>();
  for (const row of rows) {
    const { year } = jakartaParts(row.date);
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }
  const currentYear = jakartaParts(now).year;
  if (counts.size === 0) return [];
  const firstYear = Math.min(...counts.keys());
  const lastYear = Math.max(currentYear, ...counts.keys());
  return Array.from({ length: lastYear - firstYear + 1 }, (_, i) => {
    const year = firstYear + i;
    return { year, count: counts.get(year) ?? 0 };
  });
}

/**
 * Kelengkapan laporan bulanan untuk 12 bulan terakhir yang sudah lewat (bulan berjalan
 * belum dihitung karena laporannya memang belum waktunya terbit), plus status laporan
 * tahunan untuk tahun lalu.
 */
export async function getLaporanCoverage(now = new Date()) {
  const { year, month } = jakartaParts(now);
  const months = Array.from({ length: 12 }, (_, i) => {
    // i = 0 → 12 bulan lalu, i = 11 → bulan lalu
    const offset = 12 - i;
    const index = year * 12 + (month - 1) - offset;
    return { year: Math.floor(index / 12), month: (index % 12) + 1 };
  });

  const [bulanan, tahunanLastYear] = await Promise.all([
    prisma.sipLaporan.findMany({
      where: { type: "bulanan", periodYear: { in: [...new Set(months.map((m) => m.year))] } },
      select: { periodYear: true, periodMonth: true },
    }),
    prisma.sipLaporan.count({ where: { type: "tahunan", periodYear: year - 1 } }),
  ]);

  const uploaded = new Set(bulanan.map((l) => `${l.periodYear}-${l.periodMonth}`));
  return {
    months: months.map((m) => ({ ...m, uploaded: uploaded.has(`${m.year}-${m.month}`) })),
    lastYear: year - 1,
    hasTahunanLastYear: tahunanLastYear > 0,
  };
}

/** Ringkasan status konten: draft vs published, dan berapa yang di-pin tampil di beranda. */
export async function getContentSummary() {
  const [newsDraft, newsPinned, programPinned, laporanTahunan] = await Promise.all([
    prisma.sipNews.count({ where: { status: "draft" } }),
    prisma.sipNews.count({ where: { isPinned: true, status: "published" } }),
    prisma.sipProgramBantuan.count({ where: { isPinned: true } }),
    prisma.sipLaporan.count({ where: { type: "tahunan" } }),
  ]);
  const lastPenyaluran = await prisma.sipPenyaluranBantuan.findFirst({ orderBy: { date: "desc" }, select: { date: true } });
  return { newsDraft, newsPinned, programPinned, laporanTahunan, lastPenyaluranDate: lastPenyaluran?.date ?? null };
}
