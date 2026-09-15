import { BackLink } from "@/components/lazsip/ui/BackLink";
import { CampaignForm } from "@/components/lazsip/admin/CampaignForm";

export default function TambahCampaignPage() {
  return (
    <div>
      <BackLink href="/admin/lazsip/donasi">Semua Campaign</BackLink>
      <h2 className="mb-6 mt-4 text-xl font-extrabold tracking-tight text-lazsip-primary-900">Tambah Campaign</h2>
      <CampaignForm />
    </div>
  );
}
