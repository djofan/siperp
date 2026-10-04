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
    <div className="group flex w-full flex-col">
      <div className="relative">
        <ImagePlaceholder
          variant="activity"
          src={image}
          alt={title}
          className="aspect-[4/3] w-full rounded-2xl"
          imgClassName="transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {location && (
          <span className="absolute bottom-3 left-3 inline-flex max-w-[calc(100%-1.5rem)] items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-sip-primary-900 backdrop-blur-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3 w-3 shrink-0 text-sip-primary-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s-6-5.2-6-10a6 6 0 1 1 12 0c0 4.8-6 10-6 10zM12 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />
            </svg>
            <span className="truncate">{location}</span>
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5 pt-4">
        <span className="text-xs font-medium text-sip-primary-900/45">{formatDate(date)}</span>
        <h3 className="line-clamp-2 text-base font-semibold leading-snug text-sip-primary-900">{title}</h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-sip-primary-900/55">{description}</p>
      </div>
    </div>
  );
}
