import Link from "next/link";
import { ImagePlaceholder } from "@/modules/lazsip/components/ui/ImagePlaceholder";
import { ProgressBar } from "@/modules/lazsip/components/ui/ProgressBar";
import { PINNED_OVERLAY_STYLE } from "@/modules/lazsip/components/ui/pinnedOverlay";
import { formatRupiah, formatNumber } from "@/modules/lazsip/components/format";

interface CampaignCardProps {
  id: string;
  title: string;
  description?: string;
  image: string | null;
  targetAmount: number;
  currentAmount: number;
  donorCount?: number;
  featured?: boolean;
}

export function CampaignCard({ id, title, description, image, targetAmount, currentAmount, donorCount = 0, featured = false }: CampaignCardProps) {
  const percent = targetAmount ? (currentAmount / targetAmount) * 100 : 0;
  const detailHref = `/lazsip/donasi/${id}`;

  if (featured) {
    return (
      <div className="group relative flex aspect-[3/2] w-full flex-col overflow-hidden rounded-[22px]">
        <Link href={detailHref} aria-label={title} className="absolute inset-0 z-0" />
        <ImagePlaceholder variant="campaign" src={image} alt={title} className="absolute inset-0 h-full w-full" />
        <div className="pointer-events-none absolute inset-0" style={PINNED_OVERLAY_STYLE} />
        <div className="relative z-10 mt-auto flex flex-col gap-1.5 p-4 text-white">
          <h3 className="line-clamp-2 text-base font-bold leading-snug">{title}</h3>
          {description && <p className="line-clamp-1 text-xs text-white/75">{description}</p>}
          <ProgressBar percent={percent} tone="light" />
          <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
            <div className="min-w-0">
              <p className="break-words text-sm font-bold">{formatRupiah(currentAmount)}</p>
              <p className="break-words text-xs text-white/70">Terkumpul dari {formatRupiah(targetAmount)}</p>
            </div>
            <Link
              href={`${detailHref}#form`}
              className="relative z-10 shrink-0 rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-lazsip-primary-900 transition-colors hover:bg-lazsip-primary-50"
            >
              Donasi
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-lazsip-primary-100 bg-white transition-colors duration-200 hover:border-lazsip-primary-300 hover:shadow-lg hover:shadow-lazsip-primary-900/5">
      <Link href={detailHref} aria-label={title} className="absolute inset-0 z-0" />
      <ImagePlaceholder variant="campaign" src={image} alt={title} className="aspect-[4/3] w-full" />
      <div className="relative flex flex-1 flex-col gap-1.5 p-3.5">
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-bold text-lazsip-primary-900 group-hover:text-lazsip-primary-700">
          {title}
        </h3>
        <p className="line-clamp-2 min-h-[2rem] text-xs text-lazsip-primary-800/60">{description}</p>
        <div className="mt-auto flex flex-col gap-2">
          <ProgressBar percent={percent} />
          <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-xs text-lazsip-primary-800/70">
            <span className="break-words font-bold text-lazsip-primary-800">{formatRupiah(currentAmount)}</span>
            <span className="break-words">dari {formatRupiah(targetAmount)}</span>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-lazsip-primary-100 pt-2.5">
            <span className="flex min-w-0 items-center gap-1.5 text-xs text-lazsip-primary-800/55">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 2.7-5.5 7-5.5s7 2.5 7 5.5M14.5 14.8c3.5.3 5.5 2.6 5.5 5.2" />
              </svg>
              <span className="truncate">{formatNumber(donorCount)} donatur</span>
            </span>
            <Link
              href={`${detailHref}#form`}
              className="relative z-10 shrink-0 rounded-full bg-lazsip-primary-900 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-lazsip-primary-800"
            >
              Donasi
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
