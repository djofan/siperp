import { MONTH_LABEL_SHORT } from "@/modules/sip/components/format";

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
      className="group relative flex aspect-[3/4] w-full flex-col justify-between overflow-hidden rounded-2xl bg-sip-primary-900 p-5 text-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] transition-shadow duration-200 hover:shadow-lg hover:shadow-sip-primary-900/20"
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-sip-primary-400/20 blur-2xl"
        aria-hidden
      />

      <div className="relative flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14 3v5a1 1 0 0 0 1 1h5M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5zM9 13h6M9 17h4" />
          </svg>
        </span>
        <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">
          {type === "tahunan" ? "Tahunan" : "Bulanan"}
        </span>
      </div>

      <div className="relative">
        <p className="text-3xl font-extrabold leading-none">{periodMonth ? MONTH_LABEL_SHORT[periodMonth - 1] : periodYear}</p>
        {periodMonth && <p className="mt-1 text-sm text-white/65">{periodYear}</p>}
        <p className="mt-3 line-clamp-2 text-sm font-semibold leading-snug">{title}</p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-white/85 transition-colors group-hover:text-white">
          Lihat Laporan
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>
    </a>
  );
}
