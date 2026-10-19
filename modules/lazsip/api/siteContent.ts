import { apiRequest } from "@/lib/api";
export type SiteContentSectionKey = "hero" | "tentang" | "legalitas" | "kontak" | "zakatFitrah" | "transparansi";
export async function getSiteContent(sectionKey: SiteContentSectionKey) { return apiRequest<Record<string, string> | null>(`lazsip/site-content/${encodeURIComponent(sectionKey)}`); }
