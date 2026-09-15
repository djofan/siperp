import { prisma } from "@/lib/prisma";

export type SiteContentSectionKey = "hero" | "tentang" | "legalitas" | "kontak" | "zakatFitrah";

export async function getSiteContent(sectionKey: SiteContentSectionKey) {
  const row = await prisma.lazsipSiteContent.findUnique({ where: { sectionKey } });
  if (!row) return null;
  return JSON.parse(row.contentJson) as Record<string, string>;
}

export async function upsertSiteContent(
  sectionKey: SiteContentSectionKey,
  content: Record<string, string>
) {
  const contentJson = JSON.stringify(content);
  await prisma.lazsipSiteContent.upsert({
    where: { sectionKey },
    update: { contentJson },
    create: { sectionKey, contentJson },
  });
}
