import { getSiteContent } from "@/modules/lazsip/siteContent";
import { getGoldPricePerGram } from "@/modules/lazsip/goldPrice";
import { Hero } from "@/components/lazsip/sections/Hero";
import { MitraMarquee } from "@/components/lazsip/sections/MitraMarquee";
import { PenyaluranBantuanSection } from "@/components/lazsip/sections/PenyaluranBantuanSection";
import { DonasiSection } from "@/components/lazsip/sections/DonasiSection";
import { BeritaSection } from "@/components/lazsip/sections/BeritaSection";
import { KegiatanSection } from "@/components/lazsip/sections/KegiatanSection";
import { ProgramSection } from "@/components/lazsip/sections/ProgramSection";
import { TentangSection } from "@/components/lazsip/sections/TentangSection";
import { TransparansiSection } from "@/components/lazsip/sections/TransparansiSection";

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
