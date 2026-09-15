import { notFound } from "next/navigation";
import { BackLink } from "@/components/lazsip/ui/BackLink";
import { PartnerForm } from "@/components/lazsip/admin/PartnerForm";
import { getPartnerById } from "@/modules/lazsip/partners";

export default async function EditMitraPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const partner = await getPartnerById(id);

  if (!partner) {
    notFound();
  }

  return (
    <div>
      <BackLink href="/admin/lazsip/mitra">Semua Mitra</BackLink>
      <h2 className="mb-6 mt-4 text-xl font-extrabold tracking-tight text-lazsip-primary-900">Edit Mitra</h2>
      <PartnerForm partnerId={partner.id} initialValues={{ name: partner.name, logo: partner.logo ?? "", url: partner.url ?? "" }} />
    </div>
  );
}
