import { notFound } from "next/navigation";
import { getProgramById, listPrograms } from "@/modules/lazsip/programs";
import { ImagePlaceholder } from "@/components/lazsip/ui/ImagePlaceholder";
import { BackLink } from "@/components/lazsip/ui/BackLink";
import { ProgramCard } from "@/components/lazsip/ProgramCard";
import { ApplyForm } from "@/components/lazsip/sections/ApplyForm";

const CATEGORY_LABEL: Record<string, string> = {
  umum: "Program Pemberdayaan",
  pendidikan: "Divisi Pendidikan",
  sarsip: "SARSIP",
};

export default async function LazsipProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const program = await getProgramById(id);

  if (!program) {
    notFound();
  }

  const allPrograms = await listPrograms();
  const otherPrograms = allPrograms.filter((p) => p.id !== id && p.category === program.category).slice(0, 3);
  const kategoriHref = program.category === "umum" ? "/lazsip/program" : `/lazsip/program?kategori=${program.category}`;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <article className="mx-auto max-w-3xl">
        <BackLink href={kategoriHref}>Semua Program</BackLink>

        <span className="mb-4 mt-6 inline-flex items-center rounded-full bg-lazsip-primary-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-lazsip-primary-800">
          {CATEGORY_LABEL[program.category] ?? program.category}
        </span>

        <h1 className="text-balance text-[2rem] font-extrabold leading-[1.15] tracking-tight text-lazsip-primary-900 sm:text-5xl">
          {program.title}
        </h1>

        <ImagePlaceholder variant="program" src={program.image} alt={program.title} className="mt-8 aspect-[16/9] w-full rounded-3xl" />

        <p className="mt-8 whitespace-pre-line text-base leading-[1.7] text-lazsip-primary-900/80 sm:text-lg">
          {program.description}
        </p>

        {program.requirements && (
          <div className="mt-8 rounded-2xl border border-lazsip-primary-100 bg-lazsip-primary-50/60 p-6">
            <h2 className="text-base font-bold text-lazsip-primary-900">Syarat &amp; Ketentuan</h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-lazsip-primary-800/80">
              {program.requirements}
            </p>
          </div>
        )}

        <div className="mt-10 max-w-sm rounded-2xl border border-lazsip-primary-100 bg-white p-6">
          {program.registrationOpen ? (
            <ApplyForm programId={program.id} />
          ) : (
            <span className="inline-flex items-center rounded-full bg-lazsip-primary-900/5 px-6 py-3 text-sm font-semibold text-lazsip-primary-900/50">
              Pendaftaran Ditutup
            </span>
          )}
        </div>
      </article>

      {otherPrograms.length > 0 && (
        <div className="mt-16 border-t border-lazsip-primary-100 pt-12">
          <h2 className="text-xl font-extrabold tracking-tight text-lazsip-primary-900 sm:text-2xl">Program Lainnya</h2>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {otherPrograms.map((p) => (
              <ProgramCard key={p.id} id={p.id} title={p.title} description={p.description} image={p.image} registrationOpen={p.registrationOpen} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
