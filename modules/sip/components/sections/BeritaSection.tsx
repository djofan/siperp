import { listPublishedNews } from "@/modules/sip/api/news";
import { SectionHeading } from "@/modules/sip/components/ui/SectionHeading";
import { SectionEmptyState } from "@/modules/sip/components/ui/SectionEmptyState";
import { NewsCard } from "@/modules/sip/components/NewsCard";

interface BeritaSectionContent {
  eyebrow?: string;
  title?: string;
  description?: string;
}

export async function BeritaSection({ content }: { content: BeritaSectionContent }) {
  const news = await listPublishedNews();

  return (
    <section id="berita" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
      <SectionHeading
        eyebrow={content.eyebrow || "Berita"}
        title={content.title || "Kabar Terbaru dari SIP"}
        description={content.description || "Update kegiatan, kajian, dan informasi seputar Solidaritas Insan Peduli."}
      />

      {news.length === 0 ? (
        <SectionEmptyState message="Belum ada berita yang dipublikasikan." />
      ) : (
        <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {news.map((item) => (
            <NewsCard key={item.id} id={item.id} title={item.title} content={item.content} image={item.image} createdAt={item.createdAt} />
          ))}
        </div>
      )}
    </section>
  );
}
