import { prisma } from "@/lib/prisma";

export type SipSiteContentSectionKey =
  | "hero"
  | "berita"
  | "program"
  | "penyaluranBantuan"
  | "tentang"
  | "jangkauanBantuan"
  | "kontak";

export async function getSiteContent(sectionKey: SipSiteContentSectionKey) {
  const row = await prisma.sipSiteContent.findUnique({ where: { sectionKey } });
  if (!row) return null;
  return JSON.parse(row.contentJson) as Record<string, string>;
}

export async function upsertSiteContent(sectionKey: SipSiteContentSectionKey, content: Record<string, string>) {
  const contentJson = JSON.stringify(content);
  await prisma.sipSiteContent.upsert({
    where: { sectionKey },
    update: { contentJson },
    create: { sectionKey, contentJson },
  });
}
