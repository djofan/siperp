import { listPublishedNews } from "@/modules/lazsip/api/news";
import { NewsCard } from "@/modules/lazsip/components/NewsCard";
import { PinnedGridSection } from "@/modules/lazsip/components/ui/PinnedGridSection";
import { SectionHeading } from "@/modules/lazsip/components/ui/SectionHeading";

export async function BeritaSection() {
  const items = await listPublishedNews();
  const pinned = items.filter((n) => n.isPinned);
  // Item yang disematkan tetap ikut muncul di grid biasa di bawah, bukan cuma
  // di baris pin paling atas — biar gak "hilang" dari daftar utama.
  const rest = items;

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
