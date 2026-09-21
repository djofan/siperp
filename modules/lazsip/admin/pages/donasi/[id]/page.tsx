import Link from "next/link";
import { notFound } from "next/navigation";
import { BackLink } from "@/modules/lazsip/components/ui/BackLink";
import { CampaignHistoryPanel } from "@/modules/lazsip/components/admin/CampaignHistoryPanel";
import { getCampaignById, listCampaignHistory } from "@/modules/lazsip/api/campaigns";

export default async function CampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await getCampaignById(id);

  if (!campaign) {
    notFound();
  }

  const history = await listCampaignHistory(id);

  return (
    <div>
      <BackLink href="/admin/lazsip/donasi">Semua Campaign</BackLink>
      <div className="mb-6 mt-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold tracking-tight text-lazsip-primary-900 dark:text-white">{campaign.title}</h2>
        <Link
          href={`/admin/lazsip/donasi/${campaign.id}/edit`}
          className="inline-flex items-center gap-2 rounded-full border border-lazsip-primary-200 dark:border-white/15 px-4 py-2.5 text-sm font-semibold text-lazsip-primary-800 dark:text-white/70 transition-colors hover:border-lazsip-primary-400"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"
            />
          </svg>
          Edit Campaign
        </Link>
      </div>

      <CampaignHistoryPanel
        campaignId={campaign.id}
        currentAmount={campaign.currentAmount}
        targetAmount={campaign.targetAmount}
        history={history}
      />
    </div>
  );
}
