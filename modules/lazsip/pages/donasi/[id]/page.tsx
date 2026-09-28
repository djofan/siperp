import { notFound } from "next/navigation";
import { getCampaignById, listCampaigns, listCampaignHistory } from "@/modules/lazsip/api/campaigns";
import { listCheckoutMethods as listPaymentFeeRefs } from "@/modules/lazsip/api/paymentFees";
import { formatRupiah } from "@/modules/lazsip/components/format";
import { ImagePlaceholder } from "@/modules/lazsip/components/ui/ImagePlaceholder";
import { ProgressBar } from "@/modules/lazsip/components/ui/ProgressBar";
import { BackLinkGroup } from "@/modules/lazsip/components/ui/BackLinkGroup";
import { CampaignCard } from "@/modules/lazsip/components/CampaignCard";
import { RelatedCardsRow } from "@/modules/lazsip/components/ui/RelatedCardsRow";
import { CampaignDetailColumns } from "@/modules/lazsip/components/sections/CampaignDetailColumns";

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
  const history = await listCampaignHistory(id);
  const otherCampaigns = allCampaigns.filter((c) => c.id !== id && c.status === "active").slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <BackLinkGroup homeHref="/lazsip#donasi" listHref="/lazsip/donasi" listLabel="Semua Donasi" />

      <h1 className="mb-8 mt-6 text-balance text-[2rem] font-extrabold leading-[1.15] tracking-tight text-lazsip-primary-900 sm:text-4xl">
        {campaign.title}
      </h1>

      <CampaignDetailColumns
        history={history}
        campaignId={campaign.id}
        feeRefs={feeRefs}
        isActive={campaign.status === "active"}
        articleTop={
          <>
            <ImagePlaceholder variant="campaign" src={campaign.image} alt={campaign.title} className="w-full aspect-[21/9] rounded-3xl" />

            <div className="mt-8 rounded-2xl border border-lazsip-primary-100 bg-lazsip-primary-50/60 p-6">
              <ProgressBar percent={percent} />
              <div className="mt-3 flex items-center justify-between text-sm text-lazsip-primary-800/70">
                <span className="text-base font-bold text-lazsip-primary-800">{formatRupiah(campaign.currentAmount)}</span>
                <span>dari {formatRupiah(campaign.targetAmount)}</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-5">
              <p className="whitespace-pre-line text-sm leading-relaxed text-lazsip-primary-900/80">{campaign.description}</p>
            </div>
          </>
        }
      />

      {otherCampaigns.length > 0 && (
        <div className="mt-16 border-t border-lazsip-primary-100 pt-12">
          <h2 className="text-xl font-extrabold tracking-tight text-lazsip-primary-900 sm:text-2xl">Campaign Lainnya</h2>
          <RelatedCardsRow
            items={otherCampaigns}
            renderItem={(c) => (
              <CampaignCard id={c.id} title={c.title} description={c.description} image={c.image} targetAmount={c.targetAmount} currentAmount={c.currentAmount} donorCount={c.donorCount} status={c.status} />
            )}
          />
        </div>
      )}
    </div>
  );
}
