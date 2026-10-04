import { listPublishedNews } from "@/modules/sip/api/news";
import { NewsCard } from "@/modules/sip/components/NewsCard";
import { SectionHeading, AccentText } from "@/modules/sip/components/ui/SectionHeading";
import { SectionEmptyState } from "@/modules/sip/components/ui/SectionEmptyState";

export default async function BeritaListPage() {
  const news = await listPublishedNews();

  return (
    <div className="min-h-screen bg-white pb-16 pt-24 sm:pt-28">
      <div data-reveal className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Berita"
          title={
            <>
              Semua <AccentText>Berita</AccentText> SIP
            </>
          }
          description="Update kegiatan, kajian, dan informasi seputar Solidaritas Insan Peduli."
        />

        {news.length === 0 ? (
          <SectionEmptyState message="Belum ada berita yang dipublikasikan." />
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {news.map((item) => (
              <NewsCard key={item.id} id={item.id} title={item.title} content={item.content} image={item.image} createdAt={item.createdAt} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
