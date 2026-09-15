import { notFound } from "next/navigation";
import { BackLink } from "@/components/lazsip/ui/BackLink";
import { CampaignForm } from "@/components/lazsip/admin/CampaignForm";
import { getCampaignById } from "@/modules/lazsip/campaigns";

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
      <BackLink href="/admin/lazsip/donasi">Semua Campaign</BackLink>
      <h2 className="mb-6 mt-4 text-xl font-extrabold tracking-tight text-lazsip-primary-900">Edit Campaign</h2>
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
