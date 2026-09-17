import { getSiteContent } from "@/modules/sip/api/siteContent";
import { Hero } from "@/modules/sip/components/sections/Hero";
import { BeritaSection } from "@/modules/sip/components/sections/BeritaSection";
import { ProgramBantuanSection } from "@/modules/sip/components/sections/ProgramBantuanSection";
import { PenyaluranBantuanSection } from "@/modules/sip/components/sections/PenyaluranBantuanSection";

export default async function SipHomePage() {
  const [hero, berita, program, penyaluranBantuan] = await Promise.all([
    getSiteContent("hero"),
    getSiteContent("berita"),
    getSiteContent("program"),
    getSiteContent("penyaluranBantuan"),
  ]);

  return (
    <>
      <Hero hero={hero ?? {}} />
      <BeritaSection content={berita ?? {}} />
      <ProgramBantuanSection content={program ?? {}} />
      <PenyaluranBantuanSection content={penyaluranBantuan ?? {}} />
    </>
  );
}
