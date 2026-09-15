import { notFound } from "next/navigation";
import { SipAdminPageHeader } from "@/modules/sip/components/admin/SipAdminPageHeader";
import { ProgramBantuanForm } from "@/modules/sip/components/admin/ProgramBantuanForm";
import { getProgramBantuanById } from "@/modules/sip/api/programBantuan";

export default async function ProgramBantuanEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const program = await getProgramBantuanById(id);
  if (!program) notFound();

  return (
    <div>
      <SipAdminPageHeader title="Edit Program Bantuan" />
      <ProgramBantuanForm
        programId={program.id}
        initialValues={{
          title: program.title,
          slug: program.slug,
          description: program.description,
          image: program.image ?? "",
          campaignUrl: program.campaignUrl ?? "",
          isPinned: program.isPinned,
        }}
      />
    </div>
  );
}
