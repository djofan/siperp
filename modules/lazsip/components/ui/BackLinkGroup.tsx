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
    <div className="flex flex-wrap items-center gap-3">
      <BackLink href={homeHref}>Kembali ke Beranda</BackLink>
      <span className="text-lazsip-primary-800/30 dark:text-white/20">|</span>
      <BackLink href={listHref}>{listLabel}</BackLink>
    </div>
  );
}
