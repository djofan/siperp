import { notFound } from "next/navigation";
import { getProgramBantuanBySlug } from "@/modules/sip/api/programBantuan";
import { ImagePlaceholder } from "@/modules/sip/components/ui/ImagePlaceholder";
import { BackButton } from "@/modules/sip/components/ui/BackButton";

export default async function ProgramBantuanDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const program = await getProgramBantuanBySlug(slug);
  if (!program) notFound();

  return (
    <div className="min-h-screen bg-white pb-16 pt-24 sm:pt-28">
      <div data-reveal className="mx-auto max-w-3xl px-4 sm:px-6">
        <BackButton />
        <div className="mt-4">
          <ImagePlaceholder variant="program" src={program.image} alt={program.title} className="aspect-[16/9] w-full rounded-3xl" />
        </div>

        <h1 className="mt-8 text-3xl font-bold leading-tight tracking-tight text-sip-primary-900 sm:text-[2.5rem]">{program.title}</h1>
        <p className="mt-4 whitespace-pre-line text-base leading-[1.8] text-sip-primary-900/70 sm:text-[1.0625rem]">{program.description}</p>

        {program.campaignUrl && (
          <a
            href={program.campaignUrl}
            className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-sip-primary-900 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-sip-primary-800"
          >
            Infaq untuk Program Ini
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
