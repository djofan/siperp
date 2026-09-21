import Link from "next/link";
import { ImagePlaceholder } from "@/modules/lazsip/components/ui/ImagePlaceholder";
import { Badge } from "@/modules/lazsip/components/ui/Badge";
import { PINNED_OVERLAY_STYLE } from "@/modules/lazsip/components/ui/pinnedOverlay";

interface ProgramCardProps {
  id: string;
  title: string;
  description: string;
  image: string | null;
  type: string;
  registrationOpen: boolean;
  featured?: boolean;
}

function ProgramCardFooterLabel({ type, registrationOpen }: { type: string; registrationOpen: boolean }) {
  if (type === "daftar") {
    return registrationOpen ? "Daftar Sekarang" : "Pendaftaran Ditutup";
  }
  return "Baca Selengkapnya";
}

export function ProgramCard({ id, title, description, image, type, registrationOpen, featured = false }: ProgramCardProps) {
  const isOpenCta = type !== "daftar" || registrationOpen;

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
          <p className="line-clamp-1 text-xs text-white/75">{description}</p>
          {type === "daftar" && (
            <span
              className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-[11px] font-bold ${
                registrationOpen ? "bg-white/20 text-white" : "bg-white/90 text-lazsip-primary-900"
              }`}
            >
              {registrationOpen ? "Daftar Terbuka" : "Kuota Penuh"}
            </span>
          )}
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
        {type === "daftar" && !registrationOpen && (
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
          <ProgramCardFooterLabel type={type} registrationOpen={registrationOpen} />
          {isOpenCta && (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          )}
        </span>
      </div>
    </Link>
  );
}
