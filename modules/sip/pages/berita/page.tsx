import { listPublishedNews } from "@/modules/sip/api/news";
import { NewsCard } from "@/modules/sip/components/NewsCard";
import { SectionHeading } from "@/modules/sip/components/ui/SectionHeading";
import { SectionEmptyState } from "@/modules/sip/components/ui/SectionEmptyState";

export default async function BeritaListPage() {
  const news = await listPublishedNews();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <SectionHeading eyebrow="Berita" title="Semua Berita SIP" description="Update kegiatan, kajian, dan informasi seputar Solidaritas Insan Peduli." />

      {news.length === 0 ? (
        <SectionEmptyState message="Belum ada berita yang dipublikasikan." />
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {news.map((item) => (
            <NewsCard key={item.id} id={item.id} title={item.title} content={item.content} image={item.image} createdAt={item.createdAt} />
          ))}
        </div>
      )}
    </div>
  );
}
