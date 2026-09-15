import Link from "next/link";
import { ImagePlaceholder } from "@/modules/lazsip/components/ui/ImagePlaceholder";
import { PINNED_OVERLAY_STYLE } from "@/modules/lazsip/components/ui/pinnedOverlay";
import { formatDate, formatCalendarParts } from "@/modules/lazsip/components/format";

interface ActivityCardProps {
  id: string;
  title: string;
  description: string;
  image: string | null;
  date: Date;
  featured?: boolean;
}

export function ActivityCard({ id, title, description, image, date, featured = false }: ActivityCardProps) {
  if (featured) {
    const { day, month } = formatCalendarParts(date);
    return (
      <Link
        href={`/lazsip/kegiatan/${id}`}
        className="group relative flex aspect-[3/2] w-full flex-col overflow-hidden rounded-[22px]"
      >
        <ImagePlaceholder variant="activity" src={image} alt={title} className="absolute inset-0 h-full w-full" />
        <div className="pointer-events-none absolute inset-0" style={PINNED_OVERLAY_STYLE} />
        <div className="relative z-10 m-3.5 flex w-11 shrink-0 flex-col items-center overflow-hidden rounded-lg bg-white shadow-sm">
          <span className="w-full bg-lazsip-primary-900 py-0.5 text-center text-[9px] font-bold tracking-wide text-white">
            {month}
          </span>
          <span className="py-0.5 text-base font-extrabold leading-none text-lazsip-primary-900">{day}</span>
        </div>
        <div className="relative z-10 mt-auto flex flex-col gap-1 p-4 text-white">
          <h3 className="line-clamp-2 text-base font-bold leading-snug">{title}</h3>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/lazsip/kegiatan/${id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-lazsip-primary-100 bg-white transition-colors duration-200 hover:border-lazsip-primary-300 hover:shadow-lg hover:shadow-lazsip-primary-900/5"
    >
      <ImagePlaceholder variant="activity" src={image} alt={title} className="aspect-[4/3] w-full" />
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <span className="flex items-center gap-1.5 text-xs font-medium text-lazsip-primary-800/55">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10zM12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
          </svg>
          {formatDate(date)}
        </span>
        <h3 className="line-clamp-2 text-sm font-bold text-lazsip-primary-900 group-hover:text-lazsip-primary-700">
          {title}
        </h3>
        <p className="line-clamp-2 text-xs text-lazsip-primary-800/65">{description}</p>
      </div>
    </Link>
  );
}
