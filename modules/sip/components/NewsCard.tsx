import Link from "next/link";
import { ImagePlaceholder } from "@/modules/sip/components/ui/ImagePlaceholder";
import { PINNED_OVERLAY_STYLE } from "@/modules/sip/components/ui/pinnedOverlay";
import { formatDate } from "@/modules/sip/components/format";

interface NewsCardProps {
  id: string;
  title: string;
  content: string;
  image: string | null;
  createdAt: Date;
  featured?: boolean;
}

export function NewsCard({ id, title, content, image, createdAt, featured = false }: NewsCardProps) {
  if (featured) {
    return (
      <Link href={`/sip/berita/${id}`} className="group relative flex aspect-[4/3] w-full flex-col overflow-hidden rounded-2xl">
        <ImagePlaceholder variant="blog" src={image} alt={title} className="absolute inset-0 h-full w-full" />
        <div className="pointer-events-none absolute inset-0" style={PINNED_OVERLAY_STYLE} />
        <div className="relative z-10 mt-auto flex flex-col gap-1.5 p-4 text-white">
          <h3 className="line-clamp-2 text-base font-bold leading-snug">{title}</h3>
          <span className="flex items-center gap-1.5 text-xs font-medium text-white/75">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v3M16 3v3M3.5 9h17M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z" />
            </svg>
            {formatDate(createdAt)}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/sip/berita/${id}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06),0_1px_2px_rgba(0,0,0,0.04)] transition-shadow duration-200 hover:shadow-lg hover:shadow-sip-primary-900/10"
    >
      <ImagePlaceholder variant="blog" src={image} alt={title} className="aspect-[4/3] w-full" />
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <span className="flex items-center gap-1.5 text-xs font-medium text-sip-primary-800/55">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v3M16 3v3M3.5 9h17M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z" />
          </svg>
          {formatDate(createdAt)}
        </span>
        <h3 className="line-clamp-2 text-sm font-bold text-sip-primary-900 group-hover:text-sip-primary-700">{title}</h3>
        <p className="line-clamp-2 text-xs text-sip-primary-800/65">{content}</p>
        <span className="mt-auto flex items-center gap-1.5 pt-1 text-xs font-semibold text-sip-primary-800">
          Baca Selengkapnya
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
