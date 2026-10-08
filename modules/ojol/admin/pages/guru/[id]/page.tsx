import { MemberEditPage } from "@/modules/ojol/components/admin/MemberAdminPages";

export const metadata = { title: "Ubah Guru · Ojol Mengaji" };

export default async function OjolGuruEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MemberEditPage role="guru" memberId={id} />;
}
