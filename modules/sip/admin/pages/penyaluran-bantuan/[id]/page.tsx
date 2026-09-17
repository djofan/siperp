import { notFound } from "next/navigation";
import { SipAdminPageHeader } from "@/modules/sip/components/admin/SipAdminPageHeader";
import { PenyaluranBantuanForm } from "@/modules/sip/components/admin/PenyaluranBantuanForm";
import { getPenyaluranBantuanById } from "@/modules/sip/api/penyaluranBantuan";

export default async function PenyaluranBantuanEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await getPenyaluranBantuanById(id);
  if (!item) notFound();

  return (
    <div>
      <SipAdminPageHeader title="Edit Penyaluran Bantuan" />
      <PenyaluranBantuanForm
        itemId={item.id}
        initialValues={{
          title: item.title,
          description: item.description,
          image: item.image ?? "",
          location: item.location ?? "",
          date: item.date.toISOString().slice(0, 10),
        }}
      />
    </div>
  );
}
