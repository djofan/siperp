import { notFound } from "next/navigation";
import { getProgramById, listPrograms } from "@/modules/lazsip/api/programs";
import { ImagePlaceholder } from "@/modules/lazsip/components/ui/ImagePlaceholder";
import { BackLinkGroup } from "@/modules/lazsip/components/ui/BackLinkGroup";
import { ProgramCard } from "@/modules/lazsip/components/ProgramCard";
import { RelatedCardsRow } from "@/modules/lazsip/components/ui/RelatedCardsRow";

const TYPE_LABEL: Record<string, string> = {
  berita: "Berita",
  daftar: "Pendaftaran",
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
  const otherPrograms = allPrograms.filter((p) => p.id !== id).slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <article className="mx-auto max-w-3xl">
        <BackLinkGroup homeHref="/lazsip#program" listHref="/lazsip/program" listLabel="Semua Program" />

        <span className="mb-4 mt-6 inline-flex items-center rounded-full bg-lazsip-primary-50 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-lazsip-primary-800">
          {TYPE_LABEL[program.type] ?? program.type}
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

        {program.type === "daftar" && (
          <div className="mt-10 max-w-sm rounded-2xl border border-lazsip-primary-100 bg-white p-6">
            {program.registrationOpen && program.formUrl ? (
              <a
                href={program.formUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-lazsip-primary-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-lazsip-primary-800"
              >
                Daftar Sekarang
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0-7 7m7-7H3" />
                </svg>
              </a>
            ) : (
              <span className="inline-flex items-center rounded-full bg-lazsip-primary-900/5 px-6 py-3 text-sm font-semibold text-lazsip-primary-900/50">
                Pendaftaran Ditutup
              </span>
            )}
          </div>
        )}
      </article>

      {otherPrograms.length > 0 && (
        <div className="mt-16 border-t border-lazsip-primary-100 pt-12">
          <h2 className="text-xl font-extrabold tracking-tight text-lazsip-primary-900 sm:text-2xl">Program Lainnya</h2>
          <RelatedCardsRow
            items={otherPrograms}
            renderItem={(p) => (
              <ProgramCard id={p.id} title={p.title} description={p.description} image={p.image} type={p.type} registrationOpen={p.registrationOpen} />
            )}
          />
        </div>
      )}
    </div>
  );
}
