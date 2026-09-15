import Link from "next/link";
import { ImagePlaceholder } from "@/modules/lazsip/components/ui/ImagePlaceholder";
import { ProgressBar } from "@/modules/lazsip/components/ui/ProgressBar";
import { PINNED_OVERLAY_STYLE } from "@/modules/lazsip/components/ui/pinnedOverlay";
import { formatRupiah } from "@/modules/lazsip/components/format";

interface CampaignCardProps {
  id: string;
  title: string;
  image: string | null;
  targetAmount: number;
  currentAmount: number;
  featured?: boolean;
}

export function CampaignCard({ id, title, image, targetAmount, currentAmount, featured = false }: CampaignCardProps) {
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
          <ProgressBar percent={percent} tone="light" />
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{formatRupiah(currentAmount)}</p>
              <p className="text-xs text-white/70">Terkumpul dari {formatRupiah(targetAmount)}</p>
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
        <h3 className="line-clamp-2 text-sm font-bold text-lazsip-primary-900 group-hover:text-lazsip-primary-700">
          {title}
        </h3>
        <div className="mt-auto flex flex-col gap-2">
          <ProgressBar percent={percent} />
          <div className="flex items-center justify-between text-xs text-lazsip-primary-800/70">
            <span className="font-bold text-lazsip-primary-800">{formatRupiah(currentAmount)}</span>
            <span>dari {formatRupiah(targetAmount)}</span>
          </div>
          <div className="flex items-center justify-end border-t border-lazsip-primary-100 pt-2.5">
            <Link
              href={`${detailHref}#form`}
              className="relative z-10 rounded-full bg-lazsip-primary-900 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-lazsip-primary-800"
            >
              Donasi
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
