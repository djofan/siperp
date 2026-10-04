import { listPenyaluranBantuan } from "@/modules/sip/api/penyaluranBantuan";
import { SectionHeading, AccentTitle } from "@/modules/sip/components/ui/SectionHeading";
import { SectionEmptyState } from "@/modules/sip/components/ui/SectionEmptyState";
import { CarouselRow } from "@/modules/sip/components/ui/CarouselRow";
import { Button } from "@/modules/sip/components/ui/Button";
import { PenyaluranBantuanCard } from "@/modules/sip/components/PenyaluranBantuanCard";

const MAX_SHOWN = 8;

export async function PenyaluranBantuanSection({ content }: { content: Record<string, string> }) {
  const penyaluran = await listPenyaluranBantuan();
  const shown = penyaluran.slice(0, MAX_SHOWN);

  return (
    <section id="penyaluran-bantuan" className="sip-band-tint py-14 sm:py-20">
      <div data-reveal className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={content.eyebrow}
          title={<AccentTitle text={content.title} />}
          description={content.description}
        />

        {penyaluran.length === 0 ? (
          <SectionEmptyState message="Belum ada dokumentasi penyaluran bantuan." />
        ) : (
          <div className="mt-8 flex flex-col gap-8 sm:mt-10">
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
            <Button href="/sip/penyaluran-bantuan" variant="soft" icon="arrow" className="self-center">
              {content.seeAllLabel}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
