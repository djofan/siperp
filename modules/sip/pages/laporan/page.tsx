import { listLaporan } from "@/modules/sip/api/laporan";
import { SectionHeading } from "@/modules/sip/components/ui/SectionHeading";

const MONTH_LABEL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

function LaporanList({ title, items }: { title: string; items: { id: string; title: string; periodMonth: number | null; periodYear: number; fileUrl: string }[] }) {
  return (
    <div>
      <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-sip-primary-800/60">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-sip-primary-800/50">Belum ada laporan.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-sip-primary-100 bg-white">
          <ul className="divide-y divide-sip-primary-50">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 px-5 py-3.5 text-sm">
                <span className="font-medium text-sip-primary-900">
                  {item.title} — {item.periodMonth ? `${MONTH_LABEL[item.periodMonth - 1]} ` : ""}
                  {item.periodYear}
                </span>
                <a
                  href={item.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 font-semibold text-sip-primary-700 hover:underline"
                >
                  Lihat Laporan →
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default async function LaporanPage() {
  const [bulanan, tahunan] = await Promise.all([listLaporan("bulanan"), listLaporan("tahunan")]);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <SectionHeading eyebrow="Transparansi" title="Laporan Keuangan" description="Laporan bulanan dan tahunan Yayasan Solidaritas Insan Peduli." />

      <div className="mt-10 flex flex-col gap-10">
        <LaporanList title="Laporan Bulanan" items={bulanan} />
        <LaporanList title="Laporan Tahunan" items={tahunan} />
      </div>
    </div>
  );
}
