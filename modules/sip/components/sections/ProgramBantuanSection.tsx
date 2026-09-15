import { listProgramBantuan } from "@/modules/sip/api/programBantuan";
import { SectionHeading } from "@/modules/sip/components/ui/SectionHeading";
import { Button } from "@/modules/sip/components/ui/Button";
import { ProgramBantuanCard } from "@/modules/sip/components/ProgramBantuanCard";

export async function ProgramBantuanSection() {
  const programs = await listProgramBantuan();
  if (programs.length === 0) return null;

  return (
    <section id="program-bantuan" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
      <SectionHeading
        eyebrow="Program Bantuan SIP"
        title="Salurkan Kepedulian Lewat Program Kami"
        description="Bantuan darurat berdasarkan verifikasi lapangan — kesehatan, pendidikan, kebutuhan pokok, dan santunan."
        action={
          <Button href="/sip/program-bantuan" variant="secondary" icon="arrow">
            Lihat Semua Program
          </Button>
        }
      />

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {programs.slice(0, 8).map((program) => (
          <ProgramBantuanCard
            key={program.id}
            slug={program.slug}
            title={program.title}
            description={program.description}
            image={program.image}
          />
        ))}
      </div>
    </section>
  );
}
