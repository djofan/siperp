import { notFound } from "next/navigation";
import { getPublishedNewsById, listPublishedNews } from "@/modules/lazsip/api/news";
import { formatDate } from "@/modules/lazsip/components/format";
import { ImagePlaceholder } from "@/modules/lazsip/components/ui/ImagePlaceholder";
import { Button } from "@/modules/lazsip/components/ui/Button";
import { BackLinkGroup } from "@/modules/lazsip/components/ui/BackLinkGroup";
import { NewsCard } from "@/modules/lazsip/components/NewsCard";
import { RelatedCardsRow } from "@/modules/lazsip/components/ui/RelatedCardsRow";

export default async function LazsipBeritaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const news = await getPublishedNewsById(id);

  if (!news) {
    notFound();
  }

  const allNews = await listPublishedNews();
  const otherNews = allNews.filter((n) => n.id !== id).slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <article className="mx-auto max-w-3xl">
        <BackLinkGroup homeHref="/lazsip#berita" listHref="/lazsip/berita" listLabel="Semua Berita" />

        <h1 className="mt-6 text-balance text-[2rem] font-extrabold leading-[1.15] tracking-tight text-lazsip-primary-900 sm:text-5xl">
          {news.title}
        </h1>

        <div className="mt-4 flex items-center gap-1.5 text-sm font-medium text-lazsip-primary-800/55">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 3v3M16 3v3M3.5 9h17M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z" />
          </svg>
          {formatDate(news.createdAt)}
        </div>

        <ImagePlaceholder variant="news" src={news.image} alt={news.title} className="mt-8 aspect-[16/9] w-full rounded-3xl" />

        <div className="mt-8 flex flex-col gap-5">
          <p className="whitespace-pre-line text-base leading-[1.7] text-lazsip-primary-900/80 sm:text-lg">
            {news.content}
          </p>
        </div>

        <div className="mt-12 border-t border-lazsip-primary-100 pt-8">
          <Button href="/lazsip/berita" variant="secondary">
            Kembali ke Semua Berita
          </Button>
        </div>
      </article>

      {otherNews.length > 0 && (
        <div className="mt-16 border-t border-lazsip-primary-100 pt-12">
          <h2 className="text-xl font-extrabold tracking-tight text-lazsip-primary-900 sm:text-2xl">Berita Lainnya</h2>
          <RelatedCardsRow
            items={otherNews}
            renderItem={(n) => (
              <NewsCard id={n.id} title={n.title} content={n.content} image={n.image} createdAt={n.createdAt} />
            )}
          />
        </div>
      )}
    </div>
  );
}
