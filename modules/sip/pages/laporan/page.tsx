import { listLaporan } from "@/modules/sip/api/laporan";
import { SectionHeading } from "@/modules/sip/components/ui/SectionHeading";
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
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-sip-primary-800/60">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-sip-primary-800/50">Belum ada laporan.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
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
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <SectionHeading eyebrow="Transparansi" title="Laporan Keuangan" description="Laporan bulanan dan tahunan Yayasan Solidaritas Insan Peduli." />

      <div className="mt-10 flex flex-col gap-10">
        <LaporanGrid title="Laporan Bulanan" items={bulanan} />
        <LaporanGrid title="Laporan Tahunan" items={tahunan} />
      </div>
    </div>
  );
}
