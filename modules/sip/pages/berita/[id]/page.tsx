import { notFound } from "next/navigation";
import { getPublishedNewsById } from "@/modules/sip/api/news";
import { ImagePlaceholder } from "@/modules/sip/components/ui/ImagePlaceholder";
import { formatDate } from "@/modules/sip/components/format";

export default async function BeritaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const news = await getPublishedNewsById(id);
  if (!news) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <ImagePlaceholder variant="blog" src={news.image} alt={news.title} className="aspect-[16/9] w-full rounded-3xl" />

      <p className="mt-6 flex items-center gap-1.5 text-xs font-medium text-sip-primary-800/55">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-3.5 w-3.5 shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v3M16 3v3M3.5 9h17M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z" />
        </svg>
        {formatDate(news.createdAt)}
      </p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-sip-primary-900 sm:text-4xl">{news.title}</h1>
      <p className="mt-4 whitespace-pre-line text-base leading-relaxed text-sip-primary-800/70">{news.content}</p>
    </div>
  );
}
