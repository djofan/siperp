import { MONTH_LABEL_SHORT } from "@/modules/sip/components/format";
import { cardSurface } from "@/modules/sip/components/ui/surface";

export function LaporanCard({
  title,
  type,
  periodMonth,
  periodYear,
  fileUrl,
}: {
  title: string;
  type: string;
  periodMonth: number | null;
  periodYear: number;
  fileUrl: string;
}) {
  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`group flex aspect-[4/5] w-full flex-col justify-between p-5 ${cardSurface}`}
    >
      <div className="flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sip-primary-50 text-sip-primary-600">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v5a1 1 0 0 0 1 1h5M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5zM9 13h6M9 17h4" />
          </svg>
        </span>
        <span className="rounded-full bg-sip-primary-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-sip-primary-700">
          {type === "tahunan" ? "Tahunan" : "Bulanan"}
        </span>
      </div>

      <div>
        <p className="text-3xl font-bold leading-none tracking-tight text-sip-primary-900">
          {periodMonth ? MONTH_LABEL_SHORT[periodMonth - 1] : periodYear}
        </p>
        {periodMonth && <p className="mt-1 text-sm text-sip-primary-900/45">{periodYear}</p>}
        <p className="mt-3 line-clamp-2 text-sm font-medium leading-snug text-sip-primary-900/70">{title}</p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-sip-primary-600">
          Lihat Laporan
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>
    </a>
  );
}
