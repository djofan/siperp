import { listPublishedNews } from "@/modules/lazsip/news";
import { NewsCard } from "@/components/lazsip/NewsCard";
import { PinnedGridSection } from "@/components/lazsip/ui/PinnedGridSection";
import { SectionHeading } from "@/components/lazsip/ui/SectionHeading";

export async function BeritaSection() {
  const items = await listPublishedNews();
  const pinned = items.filter((n) => n.isPinned);
  const rest = items.filter((n) => !n.isPinned);

  return (
    <section id="berita" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
      <SectionHeading
        eyebrow="Berita & Kabar"
        title="Berita Terbaru LAZSIP"
        description="Ikuti perkembangan program dan kegiatan penyaluran dana umat."
      />
      <div className="mt-10">
        <PinnedGridSection
          pinnedItems={pinned}
          gridItems={rest}
          renderItem={(item) => (
            <NewsCard id={item.id} title={item.title} content={item.content} image={item.image} createdAt={item.createdAt} />
          )}
          renderPinnedItem={(item) => (
            <NewsCard id={item.id} title={item.title} content={item.content} image={item.image} createdAt={item.createdAt} featured />
          )}
          seeAllHref="/lazsip/berita"
        />
      </div>
    </section>
  );
}
