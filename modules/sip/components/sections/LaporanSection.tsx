import { listLaporan } from "@/modules/sip/api/laporan";
import { SectionHeading, AccentTitle } from "@/modules/sip/components/ui/SectionHeading";
import { SectionEmptyState } from "@/modules/sip/components/ui/SectionEmptyState";
import { CarouselRow } from "@/modules/sip/components/ui/CarouselRow";
import { Button } from "@/modules/sip/components/ui/Button";
import { LaporanCard } from "@/modules/sip/components/LaporanCard";

const MAX_SHOWN = 8;

export async function LaporanSection({ content }: { content: Record<string, string> }) {
  const laporan = await listLaporan();
  const shown = laporan.slice(0, MAX_SHOWN);

  return (
    <section id="laporan" className="bg-white py-14 sm:py-20">
      <div data-reveal className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={content.eyebrow}
          title={<AccentTitle text={content.title} />}
          description={content.description}
        />

        {shown.length === 0 ? (
          <SectionEmptyState message="Belum ada laporan yang dipublikasikan." />
        ) : (
          <div className="mt-8 flex flex-col gap-8 sm:mt-10">
            <CarouselRow
              items={shown}
              itemClassName="w-[45vw] max-w-[220px] shrink-0 snap-start sm:max-w-[240px] lg:w-[calc(20%-19.2px)] lg:max-w-none"
              renderItem={(item) => (
                <LaporanCard title={item.title} type={item.type} periodMonth={item.periodMonth} periodYear={item.periodYear} fileUrl={item.fileUrl} />
              )}
            />
            <Button href="/sip/laporan" variant="soft" icon="arrow" className="self-center">
              {content.seeAllLabel}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
