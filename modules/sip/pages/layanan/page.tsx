import { getMergedSiteContent } from "@/modules/sip/api/siteContent";
import { InfoPage, InfoLinks } from "@/modules/sip/components/InfoPage";
import { ServiceCards } from "@/modules/sip/components/Services";
export default async function ServicesPage() {
  const content = await getMergedSiteContent("layanan");
  return <InfoPage title={content.title} description={content.description}><ServiceCards content={content} /><InfoLinks current="/layanan" /></InfoPage>;
}
