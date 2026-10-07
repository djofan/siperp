import Link from "next/link";
import { ImagePlaceholder } from "@/modules/sip/components/ui/ImagePlaceholder";
import { cardSurface } from "@/modules/sip/components/ui/surface";

interface ProgramBantuanCardProps {
  slug: string;
  title: string;
  description: string;
  image: string | null;
  featured?: boolean;
}

export function ProgramBantuanCard({ slug, title, description, image, featured = false }: ProgramBantuanCardProps) {
  return (
    <Link href={`/program-bantuan/${slug}`} className={`group flex h-full w-full flex-col overflow-hidden ${cardSurface}`}>
      <ImagePlaceholder
        variant="program"
        src={image}
        alt={title}
        className={`w-full ${featured ? "aspect-[16/10]" : "aspect-[4/3]"}`}
        imgClassName="transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h3 className={`line-clamp-2 font-semibold leading-snug text-sip-primary-900 ${featured ? "text-lg" : "text-base"}`}>{title}</h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-sip-primary-900/55">{description}</p>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-semibold text-sip-primary-600">
          Selengkapnya
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>
    </Link>
  );
}
