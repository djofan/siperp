import { listProgramBantuan } from "@/modules/sip/api/programBantuan";
import { SectionHeading } from "@/modules/sip/components/ui/SectionHeading";
import { PinnedGridSection } from "@/modules/sip/components/ui/PinnedGridSection";
import { ProgramBantuanCard } from "@/modules/sip/components/ProgramBantuanCard";

interface ProgramSectionContent {
  eyebrow?: string;
  title?: string;
  description?: string;
}

export async function ProgramBantuanSection({ content }: { content: ProgramSectionContent }) {
  const items = await listProgramBantuan();
  const pinned = items.filter((p) => p.isPinned);
  // Item yang disematkan tetap ikut muncul di grid biasa di bawah, bukan cuma
  // di baris pin paling atas — biar gak "hilang" dari daftar utama.
  const rest = items;

  return (
    <section id="program" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
      <SectionHeading
        eyebrow={content.eyebrow || "Program"}
        title={content.title || "Program Bantuan yang Tersedia"}
        description={
          content.description ||
          "Pilihan program bantuan SIP berdasarkan verifikasi lapangan — kesehatan, pendidikan, kebutuhan pokok, dan santunan."
        }
      />

      <div className="mt-10">
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
          emptyLabel="Belum ada program bantuan yang ditambahkan."
        />
      </div>
    </section>
  );
}
