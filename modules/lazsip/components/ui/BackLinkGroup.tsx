import { BackLink } from "@/modules/lazsip/components/ui/BackLink";

export function BackLinkGroup({
  homeHref,
  listHref,
  listLabel,
}: {
  homeHref: string;
  listHref: string;
  listLabel: string;
}) {
  return (
    <nav aria-label="Navigasi kembali" className="flex flex-wrap items-center gap-x-4 gap-y-1 sm:gap-x-5">
      <BackLink href={homeHref}>Kembali ke Beranda</BackLink>
      <span aria-hidden="true" className="text-lazsip-primary-800/30 dark:text-white/20">/</span>
      <BackLink href={listHref}>{listLabel}</BackLink>
    </nav>
  );
}
