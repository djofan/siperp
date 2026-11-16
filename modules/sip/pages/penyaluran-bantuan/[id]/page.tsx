import { notFound } from "next/navigation";
import { getPenyaluranBantuanById } from "@/modules/sip/api/penyaluranBantuan";
import { BackButton } from "@/modules/sip/components/ui/BackButton";
import { ImagePlaceholder } from "@/modules/sip/components/ui/ImagePlaceholder";
import { SipGallery } from "@/modules/sip/components/SipGallery";
import { formatDate } from "@/modules/sip/components/format";

export default async function PenyaluranBantuanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getPenyaluranBantuanById(id);
  if (!item) notFound();

  return <article className="min-h-screen bg-white pb-14 pt-24 sm:pt-28">
    <div data-reveal className="mx-auto max-w-4xl px-4 sm:px-6">
      <BackButton href="/penyaluran-bantuan" label="Kembali ke penyaluran" />
      <header className="my-6 sm:my-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-sip-primary-700">Penyaluran bantuan</p>
        <h1 className="mt-3 break-words text-2xl font-bold leading-tight tracking-tight text-sip-primary-900 sm:text-4xl">{item.title}</h1>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-sip-primary-900/65">
          <span>{formatDate(item.date)}</span>
          {item.location && <span className="break-words">{item.location}</span>}
        </div>
      </header>
      <ImagePlaceholder variant="activity" src={item.image} alt={item.title} className="aspect-[4/3] w-full rounded-2xl sm:aspect-[16/9]" imgClassName="!object-contain" />
      <p className="mt-6 whitespace-pre-line break-words text-base leading-relaxed text-sip-primary-900/75">{item.description}</p>
      <SipGallery photos={item.documentationPhotos ?? []} title={item.title} kind="activity" />
    </div>
  </article>;
}
