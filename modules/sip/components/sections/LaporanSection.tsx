import { listLaporan } from "@/modules/sip/api/laporan";
import { SectionHeading } from "@/modules/sip/components/ui/SectionHeading";
import { SectionEmptyState } from "@/modules/sip/components/ui/SectionEmptyState";
import { CarouselRow } from "@/modules/sip/components/ui/CarouselRow";
import { Button } from "@/modules/sip/components/ui/Button";
import { LaporanCard } from "@/modules/sip/components/LaporanCard";

const MAX_SHOWN = 8;

export async function LaporanSection() {
  const laporan = await listLaporan();
  const shown = laporan.slice(0, MAX_SHOWN);

  return (
    <section id="laporan" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading
        eyebrow="Transparansi"
        title="Laporan Keuangan"
        description="Laporan bulanan dan tahunan Yayasan Solidaritas Insan Peduli, terbuka untuk publik."
      />

      {shown.length === 0 ? (
        <SectionEmptyState message="Belum ada laporan yang dipublikasikan." />
      ) : (
        <div className="mt-10 flex flex-col gap-8">
          <CarouselRow
            items={shown}
            itemClassName="w-[45vw] max-w-[220px] shrink-0 snap-start sm:max-w-[240px] lg:w-[calc(20%-16px)] lg:max-w-none"
            renderItem={(item) => (
              <LaporanCard title={item.title} type={item.type} periodMonth={item.periodMonth} periodYear={item.periodYear} fileUrl={item.fileUrl} />
            )}
          />
          <Button href="/sip/laporan" variant="secondary" icon="arrow" className="self-center">
            Lihat Semua Laporan
          </Button>
        </div>
      )}
    </section>
  );
}
