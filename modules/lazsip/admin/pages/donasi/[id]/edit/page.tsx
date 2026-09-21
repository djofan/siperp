import { notFound } from "next/navigation";
import { BackLink } from "@/modules/lazsip/components/ui/BackLink";
import { CampaignForm } from "@/modules/lazsip/components/admin/CampaignForm";
import { getCampaignById } from "@/modules/lazsip/api/campaigns";

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const campaign = await getCampaignById(id);

  if (!campaign) {
    notFound();
  }

  return (
    <div>
      <BackLink href={`/admin/lazsip/donasi/${campaign.id}`}>Kembali ke {campaign.title}</BackLink>
      <h2 className="mb-6 mt-4 text-xl font-extrabold tracking-tight text-lazsip-primary-900 dark:text-white">
        Edit Campaign
      </h2>
      <CampaignForm
        campaignId={campaign.id}
        initialValues={{
          title: campaign.title,
          description: campaign.description,
          targetAmount: String(campaign.targetAmount),
          image: campaign.image ?? "",
          uniqueCode: campaign.uniqueCode,
          isPinned: campaign.isPinned,
          status: campaign.status,
        }}
      />
    </div>
  );
}
