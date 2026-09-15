import { notFound } from "next/navigation";
import { getCampaignById, listCampaigns } from "@/modules/lazsip/campaigns";
import { listPaymentFeeRefs } from "@/modules/lazsip/paymentFees";
import { formatRupiah } from "@/components/lazsip/format";
import { ImagePlaceholder } from "@/components/lazsip/ui/ImagePlaceholder";
import { ProgressBar } from "@/components/lazsip/ui/ProgressBar";
import { BackLink } from "@/components/lazsip/ui/BackLink";
import { CampaignCard } from "@/components/lazsip/CampaignCard";
import { DonationForm } from "@/components/lazsip/sections/DonationForm";

export default async function LazsipDonasiDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [campaign, feeRefs] = await Promise.all([getCampaignById(id), listPaymentFeeRefs()]);

  if (!campaign) {
    notFound();
  }

  const percent = campaign.targetAmount ? (campaign.currentAmount / campaign.targetAmount) * 100 : 0;
  const allCampaigns = await listCampaigns();
  const otherCampaigns = allCampaigns.filter((c) => c.id !== id && c.status === "active").slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <article>
          <BackLink href="/lazsip/donasi">Semua Donasi</BackLink>

          <h1 className="mt-6 text-balance text-[2rem] font-extrabold leading-[1.15] tracking-tight text-lazsip-primary-900 sm:text-4xl">
            {campaign.title}
          </h1>

          <ImagePlaceholder variant="campaign" src={campaign.image} alt={campaign.title} className="mt-8 aspect-[16/9] w-full rounded-3xl" />

          <div className="mt-8 rounded-2xl border border-lazsip-primary-100 bg-lazsip-primary-50/60 p-6">
            <ProgressBar percent={percent} />
            <div className="mt-3 flex items-center justify-between text-sm text-lazsip-primary-800/70">
              <span className="text-base font-bold text-lazsip-primary-800">{formatRupiah(campaign.currentAmount)}</span>
              <span>dari {formatRupiah(campaign.targetAmount)}</span>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-5">
            <p className="whitespace-pre-line text-base leading-[1.7] text-lazsip-primary-900/80">{campaign.description}</p>
          </div>
        </article>

        <div className="lg:pt-6">
          {campaign.status === "active" ? (
            <DonationForm campaignId={campaign.id} feeRefs={feeRefs} />
          ) : (
            <p className="rounded-3xl border border-lazsip-primary-100 bg-white p-6 text-sm font-medium text-lazsip-primary-800/60">
              Campaign ini sudah selesai. Terima kasih atas dukungannya!
            </p>
          )}
        </div>
      </div>

      {otherCampaigns.length > 0 && (
        <div className="mt-16 border-t border-lazsip-primary-100 pt-12">
          <h2 className="text-xl font-extrabold tracking-tight text-lazsip-primary-900 sm:text-2xl">Campaign Lainnya</h2>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
            {otherCampaigns.map((c) => (
              <CampaignCard key={c.id} id={c.id} title={c.title} image={c.image} targetAmount={c.targetAmount} currentAmount={c.currentAmount} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
