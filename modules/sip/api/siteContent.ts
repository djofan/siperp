import { prisma } from "@/lib/prisma";
import { SIP_SITE_CONTENT_DEFAULTS } from "@/modules/sip/api/siteContentDefaults";
import { sipPublicUrl } from "@/modules/sip/public-url";

export type SipSiteContentSectionKey =
  | "hero"
  | "berita"
  | "program"
  | "penyaluranBantuan"
  | "tentang"
  | "jangkauanBantuan"
  | "laporan"
  | "kontak"
  | "layanan"
  | "footer";

export const SIP_SITE_CONTENT_KEYS: SipSiteContentSectionKey[] = [
  "hero",
  "berita",
  "program",
  "penyaluranBantuan",
  "tentang",
  "jangkauanBantuan",
  "laporan",
  "kontak",
  "layanan",
  "footer",
];

export async function getSiteContent(sectionKey: SipSiteContentSectionKey) {
  const row = await prisma.sipSiteContent.findUnique({ where: { sectionKey } });
  if (!row) return null;
  return JSON.parse(row.contentJson) as Record<string, string>;
}

/**
 * Konten section yang sudah digabung dengan default: field yang belum pernah diisi / dikosongkan
 * admin jatuh ke teks default (yang sama persis dengan isi awal form admin). Dipakai halaman
 * publik supaya field baru yang ditambahkan belakangan tetap punya teks walau data lama di DB
 * belum memuatnya.
 */
export async function getMergedSiteContent(sectionKey: SipSiteContentSectionKey): Promise<Record<string, string>> {
  const saved = (await getSiteContent(sectionKey)) ?? {};
  const merged: Record<string, string> = { ...SIP_SITE_CONTENT_DEFAULTS[sectionKey] };
  for (const [key, value] of Object.entries(saved)) {
    if (typeof value === "string" && value.trim() !== "") merged[key] = /(?:url|href)$/i.test(key) ? sipPublicUrl(value) : value;
  }
  return merged;
}

/** Toggle "Tampilkan di landing page" — disimpan sebagai string "true"/"false", default tampil. */
export function isSectionVisible(content: Record<string, string>) {
  return content.visible !== "false";
}

/** Pecah textarea "satu poin per baris" jadi array tanpa baris kosong. */
export function splitLines(value: string | undefined) {
  return (value ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function upsertSiteContent(sectionKey: SipSiteContentSectionKey, content: Record<string, string>) {
  const contentJson = JSON.stringify(content);
  await prisma.sipSiteContent.upsert({
    where: { sectionKey },
    update: { contentJson },
    create: { sectionKey, contentJson },
  });
}
