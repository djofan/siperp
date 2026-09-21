import { listPenyaluranBantuan } from "@/modules/sip/api/penyaluranBantuan";
import { SectionHeading } from "@/modules/sip/components/ui/SectionHeading";
import { SectionEmptyState } from "@/modules/sip/components/ui/SectionEmptyState";
import { CarouselRow } from "@/modules/sip/components/ui/CarouselRow";
import { Button } from "@/modules/sip/components/ui/Button";
import { PenyaluranBantuanCard } from "@/modules/sip/components/PenyaluranBantuanCard";

const MAX_SHOWN = 8;

interface PenyaluranBantuanSectionContent {
  eyebrow?: string;
  title?: string;
  description?: string;
}

export async function PenyaluranBantuanSection({ content }: { content: PenyaluranBantuanSectionContent }) {
  const penyaluran = await listPenyaluranBantuan();
  const shown = penyaluran.slice(0, MAX_SHOWN);

  return (
    <section id="penyaluran-bantuan" className="bg-sip-primary-50/50 py-12 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={content.eyebrow || "Penyaluran Bantuan"}
          title={content.title || "Sudah Tersalurkan ke Mana Saja"}
          description={content.description || "Dokumentasi realisasi penyaluran bantuan oleh tim verifikator SIP di lapangan."}
        />

        {penyaluran.length === 0 ? (
          <SectionEmptyState message="Belum ada dokumentasi penyaluran bantuan." />
        ) : (
          <div className="mt-10 flex flex-col gap-8">
            <CarouselRow
              items={shown}
              renderItem={(item) => (
                <PenyaluranBantuanCard
                  title={item.title}
                  description={item.description}
                  image={item.image}
                  location={item.location}
                  date={item.date}
                />
              )}
            />
            <Button href="/sip/penyaluran-bantuan" variant="secondary" icon="arrow" className="self-center">
              Lihat Semua
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
