import { notFound } from "next/navigation";
import { getCampaignById, listCampaigns, listCampaignDonorsPublic } from "@/modules/lazsip/api/campaigns";
import { listCheckoutMethods as listPaymentFeeRefs } from "@/modules/lazsip/api/paymentFees";
import { formatRupiah } from "@/modules/lazsip/components/format";
import { ImagePlaceholder } from "@/modules/lazsip/components/ui/ImagePlaceholder";
import { ProgressBar } from "@/modules/lazsip/components/ui/ProgressBar";
import { BackLinkGroup } from "@/modules/lazsip/components/ui/BackLinkGroup";
import { CampaignCard } from "@/modules/lazsip/components/CampaignCard";
import { RelatedCardsRow } from "@/modules/lazsip/components/ui/RelatedCardsRow";
import { DonationForm } from "@/modules/lazsip/components/sections/DonationForm";

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
  const donors = await listCampaignDonorsPublic(id);
  const otherCampaigns = allCampaigns.filter((c) => c.id !== id && c.status === "active").slice(0, 3);

  return (
    <div className="mx-auto max-w-6xl px-4 pb-20 pt-28 sm:px-6 sm:pt-32">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <article>
          <BackLinkGroup homeHref="/lazsip#donasi" listHref="/lazsip/donasi" listLabel="Semua Donasi" />

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
          <section className="mt-10 rounded-2xl border border-lazsip-primary-100 bg-white p-6" aria-labelledby="campaign-donors">
            <h2 id="campaign-donors" className="text-xl font-bold text-lazsip-primary-900">Donatur</h2>
            {donors.length ? (
              <ul className="mt-4 divide-y divide-lazsip-primary-100">
                {donors.map((donor) => (
                  <li key={donor.id} className="flex items-start justify-between gap-4 py-3 text-sm text-lazsip-primary-800">
                    <span className="min-w-0 break-words">{donor.name}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{formatRupiah(donor.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-3 text-sm text-lazsip-primary-800/70">Belum ada donasi yang terkonfirmasi.</p>}
          </section>
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
          <RelatedCardsRow
            items={otherCampaigns}
            renderItem={(c) => (
              <CampaignCard id={c.id} title={c.title} description={c.description} image={c.image} targetAmount={c.targetAmount} currentAmount={c.currentAmount} donorCount={c.donorCount} />
            )}
          />
        </div>
      )}
    </div>
  );
}
