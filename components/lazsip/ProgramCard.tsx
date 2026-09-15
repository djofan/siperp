import Link from "next/link";
import { ImagePlaceholder } from "@/components/lazsip/ui/ImagePlaceholder";
import { Badge } from "@/components/lazsip/ui/Badge";
import { PINNED_OVERLAY_STYLE } from "@/components/lazsip/ui/pinnedOverlay";

interface ProgramCardProps {
  id: string;
  title: string;
  description: string;
  image: string | null;
  registrationOpen: boolean;
  featured?: boolean;
}

export function ProgramCard({ id, title, description, image, registrationOpen, featured = false }: ProgramCardProps) {
  if (featured) {
    return (
      <Link
        href={`/lazsip/program/${id}`}
        className="group relative flex aspect-[3/2] w-full flex-col overflow-hidden rounded-[22px]"
      >
        <ImagePlaceholder variant="program" src={image} alt={title} className="absolute inset-0 h-full w-full" />
        <div className="pointer-events-none absolute inset-0" style={PINNED_OVERLAY_STYLE} />
        <div className="relative z-10 mt-auto flex flex-col gap-1.5 p-4 text-white">
          <h3 className="line-clamp-2 text-base font-bold leading-snug">{title}</h3>
          <span
            className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-[11px] font-bold ${
              registrationOpen ? "bg-white/20 text-white" : "bg-white/90 text-lazsip-primary-900"
            }`}
          >
            {registrationOpen ? "Daftar Terbuka" : "Kuota Penuh"}
          </span>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={`/lazsip/program/${id}`}
      className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-lazsip-primary-100 bg-white transition-colors duration-200 hover:border-lazsip-primary-300 hover:shadow-lg hover:shadow-lazsip-primary-900/5"
    >
      <div className="relative">
        <ImagePlaceholder variant="program" src={image} alt={title} className="aspect-[4/3] w-full" />
        {!registrationOpen && (
          <span className="absolute right-3 top-3">
            <Badge tone="neutral">Kuota Penuh</Badge>
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3.5">
        <h3 className="line-clamp-2 text-sm font-bold text-lazsip-primary-900 group-hover:text-lazsip-primary-700">
          {title}
        </h3>
        <p className="line-clamp-2 text-xs text-lazsip-primary-800/65">{description}</p>
        <span className="mt-auto flex items-center gap-1.5 pt-1 text-xs font-semibold text-lazsip-primary-800">
          {registrationOpen ? "Daftar Sekarang" : "Pendaftaran Ditutup"}
          {registrationOpen && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          )}
        </span>
      </div>
    </Link>
  );
}
