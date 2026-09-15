import Link from "next/link";
import { ImagePlaceholder } from "@/modules/sip/components/ui/ImagePlaceholder";

export function ProgramBantuanCard({
  slug,
  title,
  description,
  image,
}: {
  slug: string;
  title: string;
  description: string;
  image: string | null;
}) {
  return (
    <Link
      href={`/sip/program-bantuan/${slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-sip-primary-100 bg-white transition-colors duration-200 hover:border-sip-primary-300 hover:shadow-lg hover:shadow-sip-primary-900/5"
    >
      <ImagePlaceholder variant="program" src={image} alt={title} className="aspect-[4/3] w-full" />
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="line-clamp-1 text-sm font-bold text-sip-primary-900 group-hover:text-sip-primary-700">{title}</h3>
        <p className="line-clamp-2 text-xs text-sip-primary-800/65">{description}</p>
        <span className="mt-auto flex items-center gap-1.5 pt-1 text-xs font-semibold text-sip-primary-800">
          Selengkapnya
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
