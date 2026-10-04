import { listPublishedNews } from "@/modules/sip/api/news";
import { SectionHeading, AccentTitle } from "@/modules/sip/components/ui/SectionHeading";
import { PinnedGridSection } from "@/modules/sip/components/ui/PinnedGridSection";
import { NewsCard } from "@/modules/sip/components/NewsCard";

export async function BeritaSection({ content }: { content: Record<string, string> }) {
  const items = await listPublishedNews();
  const pinned = items.filter((n) => n.isPinned);
  // Item yang disematkan tetap ikut muncul di grid biasa di bawah, bukan cuma
  // di baris pin paling atas — biar gak "hilang" dari daftar utama.
  const rest = items;

  return (
    <section id="berita" className="sip-band-tint py-14 sm:py-20">
      <div data-reveal className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow={content.eyebrow}
          title={<AccentTitle text={content.title} />}
          description={content.description}
        />

        <div className="mt-8 sm:mt-10">
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
            seeAllLabel={content.seeAllLabel}
            emptyLabel="Belum ada berita yang dipublikasikan."
          />
        </div>
      </div>
    </section>
  );
}
