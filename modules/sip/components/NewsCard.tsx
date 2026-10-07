import Link from "next/link";
import { ImagePlaceholder } from "@/modules/sip/components/ui/ImagePlaceholder";
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
  return (
    <Link href={`/berita/${id}`} className="group flex w-full flex-col rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-sip-primary-500 focus-visible:ring-offset-4">
      <ImagePlaceholder
        variant="blog"
        src={image}
        alt={title}
        className={`w-full rounded-2xl ${featured ? "aspect-[16/10]" : "aspect-[4/3]"}`}
        imgClassName="transition-transform duration-500 group-hover:scale-[1.03]"
      />
      <div className="flex flex-col gap-2 pt-4">
        <span className="text-xs font-medium text-sip-primary-900/45">{formatDate(createdAt)}</span>
        <h3
          className={`line-clamp-2 font-semibold leading-snug text-sip-primary-900 transition-colors group-hover:text-sip-primary-600 ${
            featured ? "text-lg" : "text-base"
          }`}
        >
          {title}
        </h3>
        <p className="line-clamp-2 text-sm leading-relaxed text-sip-primary-900/55">{content}</p>
      </div>
    </Link>
  );
}
