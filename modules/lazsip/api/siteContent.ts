import { LAZSIP_SITE_CONTENT_DEFAULTS } from "./siteContentDefaults";
import { apiRequest } from "@/lib/api";
export type SiteContentSectionKey = "hero" | "tentang" | "legalitas" | "kontak" | "zakatFitrah" | "transparansi";
export async function getSiteContent(sectionKey: SiteContentSectionKey) {
  const content=await apiRequest<Record<string,string>|null>(`lazsip/site-content/${encodeURIComponent(sectionKey)}`);
  if(sectionKey!=="kontak")return content;
  return {...LAZSIP_SITE_CONTENT_DEFAULTS.kontak,...content,address:content?.address?.trim()||LAZSIP_SITE_CONTENT_DEFAULTS.kontak.address,phone:content?.phone?.trim()||LAZSIP_SITE_CONTENT_DEFAULTS.kontak.phone,email:content?.email?.trim()||LAZSIP_SITE_CONTENT_DEFAULTS.kontak.email};
}
