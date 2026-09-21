import { listProgramBantuan } from "@/modules/sip/api/programBantuan";
import { ProgramBantuanCard } from "@/modules/sip/components/ProgramBantuanCard";
import { SectionHeading } from "@/modules/sip/components/ui/SectionHeading";
import { SectionEmptyState } from "@/modules/sip/components/ui/SectionEmptyState";

export default async function ProgramBantuanListPage() {
  const programs = await listProgramBantuan();

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <SectionHeading
        eyebrow="Program"
        title="Semua Program Bantuan SIP"
        description="Pilihan program bantuan SIP berdasarkan verifikasi lapangan — kesehatan, pendidikan, kebutuhan pokok, dan santunan."
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
    </div>
  );
}
