import { getSiteContent } from "@/modules/lazsip/api/siteContent";
import { getGoldPricePerGram } from "@/modules/lazsip/api/goldPrice";
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
  const [hero, goldPricePerGram] = await Promise.all([getSiteContent("hero"), getGoldPricePerGram()]);

  return (
    <>
      <Hero hero={hero ?? {}} goldPricePerGram={goldPricePerGram} />
      <MitraMarquee />
      <PenyaluranBantuanSection />
      <DonasiSection />
      <BeritaSection />
      <KegiatanSection />
      <ProgramSection
        id="program"
        category="umum"
        eyebrow="Program Pemberdayaan"
        title="Program Pemberdayaan Umat"
        description="Program pemberdayaan ekonomi dan sosial bagi masyarakat dampingan LAZSIP."
        seeAllHref="/lazsip/program"
      />
      <ProgramSection
        id="divisi-pendidikan"
        category="pendidikan"
        eyebrow="Divisi Pendidikan"
        title="Divisi Pendidikan LAZSIP"
        description="Program beasiswa dan pembinaan pendidikan bagi anak yatim dan dhuafa."
        seeAllHref="/lazsip/program?kategori=pendidikan"
        tinted
      />
      <ProgramSection
        id="sarsip"
        category="sarsip"
        eyebrow="SARSIP"
        title="SARSIP — Siaga & Relawan LAZSIP"
        description="Program tanggap bencana dan layanan darurat di bawah naungan LAZSIP."
        seeAllHref="/lazsip/program?kategori=sarsip"
      />
      <TentangSection />
      <TransparansiSection />
    </>
  );
}
