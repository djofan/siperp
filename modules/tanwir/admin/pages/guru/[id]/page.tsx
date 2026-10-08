import { MemberEditPage } from "@/modules/tanwir/components/admin/MemberAdminPages";

export const metadata = { title: "Ubah Guru · Tanwir Qurani" };

export default async function TanwirGuruEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MemberEditPage role="guru" memberId={id} />;
}
