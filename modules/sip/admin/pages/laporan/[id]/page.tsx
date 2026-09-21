import { notFound } from "next/navigation";
import { SipAdminPageHeader } from "@/modules/sip/components/admin/SipAdminPageHeader";
import { LaporanForm } from "@/modules/sip/components/admin/LaporanForm";
import { getLaporanById } from "@/modules/sip/api/laporan";

export default async function LaporanEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const laporan = await getLaporanById(id);
  if (!laporan) notFound();

  return (
    <div>
      <SipAdminPageHeader title="Edit Laporan" />
      <LaporanForm
        laporanId={laporan.id}
        initialValues={{
          title: laporan.title,
          type: laporan.type,
          periodMonth: String(laporan.periodMonth ?? 1),
          periodYear: String(laporan.periodYear),
          fileUrl: laporan.fileUrl,
        }}
      />
    </div>
  );
}
