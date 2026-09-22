import { getSiteContent } from "@/modules/sip/api/siteContent";
import { listProgramBantuan } from "@/modules/sip/api/programBantuan";
import { listPenyaluranBantuan } from "@/modules/sip/api/penyaluranBantuan";
import { Hero } from "@/modules/sip/components/sections/Hero";
import { BeritaSection } from "@/modules/sip/components/sections/BeritaSection";
import { ProgramBantuanSection } from "@/modules/sip/components/sections/ProgramBantuanSection";
import { PenyaluranBantuanSection } from "@/modules/sip/components/sections/PenyaluranBantuanSection";
import { TentangSection } from "@/modules/sip/components/sections/TentangSection";
import { JangkauanBantuanSection } from "@/modules/sip/components/sections/JangkauanBantuanSection";
import { LaporanSection } from "@/modules/sip/components/sections/LaporanSection";
import { formatNumber } from "@/modules/sip/components/format";

export default async function SipHomePage() {
  const [hero, berita, program, penyaluranBantuan, programList, penyaluranList] = await Promise.all([
    getSiteContent("hero"),
    getSiteContent("berita"),
    getSiteContent("program"),
    getSiteContent("penyaluranBantuan"),
    listProgramBantuan(),
    listPenyaluranBantuan(),
  ]);

  const stats = [
    { value: `${formatNumber(programList.length)}+`, label: "Program Bantuan" },
    { value: `${formatNumber(penyaluranList.length)}+`, label: "Bantuan Tersalurkan" },
  ].filter((stat) => !stat.value.startsWith("0"));

  return (
    <>
      <Hero hero={hero ?? {}} stats={stats} />
      <BeritaSection content={berita ?? {}} />
      <ProgramBantuanSection content={program ?? {}} />
      <PenyaluranBantuanSection content={penyaluranBantuan ?? {}} />
      <TentangSection />
      <JangkauanBantuanSection />
      <LaporanSection />
    </>
  );
}
