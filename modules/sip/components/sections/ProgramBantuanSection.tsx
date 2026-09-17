import { listProgramBantuan } from "@/modules/sip/api/programBantuan";
import { SectionHeading } from "@/modules/sip/components/ui/SectionHeading";
import { SectionEmptyState } from "@/modules/sip/components/ui/SectionEmptyState";
import { ProgramBantuanCard } from "@/modules/sip/components/ProgramBantuanCard";

interface ProgramSectionContent {
  eyebrow?: string;
  title?: string;
  description?: string;
}

export async function ProgramBantuanSection({ content }: { content: ProgramSectionContent }) {
  const programs = await listProgramBantuan();

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

      {programs.length === 0 ? (
        <SectionEmptyState message="Belum ada program bantuan yang ditambahkan." />
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {programs.map((program) => (
            <ProgramBantuanCard
              key={program.id}
              slug={program.slug}
              title={program.title}
              description={program.description}
              image={program.image}
            />
          ))}
        </div>
      )}
    </section>
  );
}
