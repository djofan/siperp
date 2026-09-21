import { getSiteContent } from "@/modules/lazsip/api/siteContent";
import { getGoldPricePerGram } from "@/modules/lazsip/api/goldPrice";
import { getZakatFitrahPricePerJiwa } from "@/modules/lazsip/api/zakat";
import { Hero } from "@/modules/lazsip/components/sections/Hero";
import { MitraMarquee } from "@/modules/lazsip/components/sections/MitraMarquee";
import { PenyaluranBantuanSection } from "@/modules/lazsip/components/sections/PenyaluranBantuanSection";
import { DonasiSection } from "@/modules/lazsip/components/sections/DonasiSection";
import { BeritaSection } from "@/modules/lazsip/components/sections/BeritaSection";
import { KegiatanSection } from "@/modules/lazsip/components/sections/KegiatanSection";
import { ProgramSection } from "@/modules/lazsip/components/sections/ProgramSection";
import { TentangSection } from "@/modules/lazsip/components/sections/TentangSection";
import { TransparansiSection } from "@/modules/lazsip/components/sections/TransparansiSection";

export default async function LazsipHomePage() {
  const [hero, goldPricePerGram, fitrahPricePerJiwa] = await Promise.all([
    getSiteContent("hero"),
    getGoldPricePerGram(),
    getZakatFitrahPricePerJiwa(),
  ]);

  return (
    <>
      <Hero hero={hero ?? {}} goldPricePerGram={goldPricePerGram} fitrahPricePerJiwa={fitrahPricePerJiwa} />
      <MitraMarquee />
      <PenyaluranBantuanSection />
      <DonasiSection />
      <BeritaSection />
      <KegiatanSection />
      <ProgramSection
        id="program"
        eyebrow="Program Pemberdayaan"
        title="Program Pemberdayaan Umat"
        description="Program pemberdayaan ekonomi dan sosial bagi masyarakat dampingan LAZSIP."
        seeAllHref="/lazsip/program"
      />
      <TentangSection />
      <TransparansiSection />
    </>
  );
}
