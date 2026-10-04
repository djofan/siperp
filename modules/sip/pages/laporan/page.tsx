import { listLaporan } from "@/modules/sip/api/laporan";
import { SectionHeading, AccentText } from "@/modules/sip/components/ui/SectionHeading";
import { LaporanCard } from "@/modules/sip/components/LaporanCard";

function LaporanGrid({
  title,
  items,
}: {
  title: string;
  items: { id: string; title: string; type: string; periodMonth: number | null; periodYear: number; fileUrl: string }[];
}) {
  return (
    <div>
      <h2 className="mb-5 text-xs font-semibold uppercase tracking-[0.18em] text-sip-primary-600">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-sip-primary-900/50">Belum ada laporan.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-5">
          {items.map((item) => (
            <LaporanCard key={item.id} title={item.title} type={item.type} periodMonth={item.periodMonth} periodYear={item.periodYear} fileUrl={item.fileUrl} />
          ))}
        </div>
      )}
    </div>
  );
}

export default async function LaporanPage() {
  const [bulanan, tahunan] = await Promise.all([listLaporan("bulanan"), listLaporan("tahunan")]);

  return (
    <div className="min-h-screen bg-white pb-16 pt-24 sm:pt-28">
      <div data-reveal className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Transparansi"
          title={
            <>
              Laporan <AccentText>Keuangan</AccentText>
            </>
          }
          description="Laporan bulanan dan tahunan Yayasan Solidaritas Insan Peduli."
        />

        <div className="mt-8 flex flex-col gap-10">
          <LaporanGrid title="Laporan Bulanan" items={bulanan} />
          <LaporanGrid title="Laporan Tahunan" items={tahunan} />
        </div>
      </div>
    </div>
  );
}
