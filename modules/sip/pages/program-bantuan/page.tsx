import { listProgramBantuan } from "@/modules/sip/api/programBantuan";
import { ProgramBantuanCard } from "@/modules/sip/components/ProgramBantuanCard";
import { SectionHeading, AccentText } from "@/modules/sip/components/ui/SectionHeading";
import { SectionEmptyState } from "@/modules/sip/components/ui/SectionEmptyState";

export default async function ProgramBantuanListPage() {
  const programs = await listProgramBantuan();

  return (
    <div className="min-h-screen bg-white pb-16 pt-24 sm:pt-28">
      <div data-reveal className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="Program"
          title={
            <>
              Semua Program <AccentText>Bantuan</AccentText> SIP
            </>
          }
          description="Pilihan program bantuan SIP berdasarkan verifikasi lapangan — kesehatan, pendidikan, kebutuhan pokok, dan santunan."
        />

        {programs.length === 0 ? (
          <SectionEmptyState message="Belum ada program bantuan yang ditambahkan." />
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
    </div>
  );
}
