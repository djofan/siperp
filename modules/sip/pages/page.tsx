import { getSiteContent } from "@/modules/sip/api/siteContent";
import { Hero } from "@/modules/sip/components/sections/Hero";
import { KegiatanSection } from "@/modules/sip/components/sections/KegiatanSection";
import { ProgramBantuanSection } from "@/modules/sip/components/sections/ProgramBantuanSection";
import { DivisiSection } from "@/modules/sip/components/sections/DivisiSection";
import { MitraMarquee } from "@/modules/sip/components/sections/MitraMarquee";

export default async function SipHomePage() {
  const hero = await getSiteContent("hero");

  return (
    <>
      <Hero hero={hero ?? {}} />
      <KegiatanSection />
      <ProgramBantuanSection />
      <DivisiSection />
      <MitraMarquee />
    </>
  );
}
