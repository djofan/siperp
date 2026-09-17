import { ImagePlaceholder } from "@/modules/sip/components/ui/ImagePlaceholder";
import { formatDate } from "@/modules/sip/components/format";

export function PenyaluranBantuanCard({
  title,
  description,
  image,
  location,
  date,
}: {
  title: string;
  description: string;
  image: string | null;
  location: string | null;
  date: Date;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-sip-primary-100 bg-white transition-colors duration-200 hover:border-sip-primary-300 hover:shadow-lg hover:shadow-sip-primary-900/5">
      <div className="relative">
        <ImagePlaceholder variant="activity" src={image} alt={title} className="aspect-[4/3] w-full" />
        {location && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-sip-primary-900/85 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10zM12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
            </svg>
            {location}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <span className="flex items-center gap-1.5 text-xs font-medium text-sip-primary-800/55">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v3M16 3v3M3.5 9h17M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z" />
          </svg>
          {formatDate(date)}
        </span>
        <h3 className="line-clamp-2 text-sm font-bold text-sip-primary-900">{title}</h3>
        <p className="line-clamp-3 text-xs text-sip-primary-800/65">{description}</p>
      </div>
    </div>
  );
}
