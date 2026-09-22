import { listPublishedNews } from "@/modules/sip/api/news";
import { SectionHeading } from "@/modules/sip/components/ui/SectionHeading";
import { PinnedGridSection } from "@/modules/sip/components/ui/PinnedGridSection";
import { NewsCard } from "@/modules/sip/components/NewsCard";

interface BeritaSectionContent {
  eyebrow?: string;
  title?: string;
  description?: string;
}

export async function BeritaSection({ content }: { content: BeritaSectionContent }) {
  const items = await listPublishedNews();
  const pinned = items.filter((n) => n.isPinned);
  // Item yang disematkan tetap ikut muncul di grid biasa di bawah, bukan cuma
  // di baris pin paling atas — biar gak "hilang" dari daftar utama.
  const rest = items;

  return (
    <section id="berita" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
      <SectionHeading
        eyebrow={content.eyebrow || "Berita"}
        title={content.title || "Kabar Terbaru dari SIP"}
        description={content.description || "Update kegiatan, kajian, dan informasi seputar Solidaritas Insan Peduli."}
      />

      <div className="mt-10">
        <PinnedGridSection
          pinnedItems={pinned}
          gridItems={rest}
          maxPinnedItems={6}
          maxGridItems={4}
          renderItem={(item) => (
            <NewsCard id={item.id} title={item.title} content={item.content} image={item.image} createdAt={item.createdAt} />
          )}
          renderPinnedItem={(item) => (
            <NewsCard id={item.id} title={item.title} content={item.content} image={item.image} createdAt={item.createdAt} featured />
          )}
          seeAllHref="/sip/berita"
          emptyLabel="Belum ada berita yang dipublikasikan."
        />
      </div>
    </section>
  );
}
