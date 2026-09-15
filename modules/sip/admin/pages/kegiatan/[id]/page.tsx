import { notFound } from "next/navigation";
import { SipAdminPageHeader } from "@/modules/sip/components/admin/SipAdminPageHeader";
import { KegiatanForm } from "@/modules/sip/components/admin/KegiatanForm";
import { getKegiatanById } from "@/modules/sip/api/kegiatan";

export default async function KegiatanEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const kegiatan = await getKegiatanById(id);
  if (!kegiatan) notFound();

  return (
    <div>
      <SipAdminPageHeader title="Edit Kegiatan" />
      <KegiatanForm
        kegiatanId={kegiatan.id}
        initialValues={{
          title: kegiatan.title,
          description: kegiatan.description,
          image: kegiatan.image ?? "",
          date: kegiatan.date.toISOString().slice(0, 10),
        }}
      />
    </div>
  );
}
