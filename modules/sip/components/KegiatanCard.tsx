import { ImagePlaceholder } from "@/modules/sip/components/ui/ImagePlaceholder";
import { formatDate } from "@/modules/sip/components/format";

export function KegiatanCard({
  title,
  description,
  image,
  date,
}: {
  title: string;
  description: string;
  image: string | null;
  date: Date;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-sip-primary-100 bg-white">
      <ImagePlaceholder variant="activity" src={image} alt={title} className="aspect-[4/3] w-full" />
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <span className="flex items-center gap-1.5 text-xs font-medium text-sip-primary-800/55">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10zM12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
          </svg>
          {formatDate(date)}
        </span>
        <h3 className="line-clamp-2 text-sm font-bold text-sip-primary-900">{title}</h3>
        <p className="line-clamp-3 text-xs text-sip-primary-800/65">{description}</p>
      </div>
    </div>
  );
}
