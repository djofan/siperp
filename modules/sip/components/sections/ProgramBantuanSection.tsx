import { listProgramBantuan } from "@/modules/sip/api/programBantuan";
import { SectionHeading, AccentTitle } from "@/modules/sip/components/ui/SectionHeading";
import { PinnedGridSection } from "@/modules/sip/components/ui/PinnedGridSection";
import { ProgramBantuanCard } from "@/modules/sip/components/ProgramBantuanCard";

export async function ProgramBantuanSection({ content }: { content: Record<string, string> }) {
  const items = await listProgramBantuan();
  const pinned = items.filter((p) => p.isPinned);
  // Item yang disematkan tetap ikut muncul di grid biasa di bawah, bukan cuma
  // di baris pin paling atas — biar gak "hilang" dari daftar utama.
  const rest = items;

  return (
    <section id="program" className="bg-white py-14 sm:py-20">
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
            maxGridItems={12}
            renderItem={(program) => (
              <ProgramBantuanCard slug={program.slug} title={program.title} description={program.description} image={program.image} />
            )}
            renderPinnedItem={(program) => (
              <ProgramBantuanCard slug={program.slug} title={program.title} description={program.description} image={program.image} featured />
            )}
            seeAllHref="/sip/program-bantuan"
            seeAllLabel={content.seeAllLabel}
            emptyLabel="Belum ada program bantuan yang ditambahkan."
          />
        </div>
      </div>
    </section>
  );
}
