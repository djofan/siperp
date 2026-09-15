import Link from "next/link";
import { AdminPageHeader } from "@/components/lazsip/admin/AdminPageHeader";
import { CampaignTable } from "@/components/lazsip/admin/CampaignTable";
import { listCampaigns } from "@/modules/lazsip/campaigns";

export default async function DonasiListPage() {
  const campaigns = await listCampaigns();

  return (
    <div>
      <AdminPageHeader
        title="Campaign Donasi"
        description="Semua campaign settle ke satu rekening bersama, dibedakan lewat kode unik saat rekonsiliasi."
        action={
          <Link
            href="/admin/lazsip/donasi/baru"
            className="inline-flex items-center gap-2 rounded-full bg-lazsip-primary-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-lazsip-primary-800"
          >
            + Tambah Campaign
          </Link>
        }
      />
      <CampaignTable campaigns={campaigns} />
    </div>
  );
}
