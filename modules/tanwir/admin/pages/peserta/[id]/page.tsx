import { MemberEditPage } from "@/modules/tanwir/components/admin/MemberAdminPages";

export const metadata = { title: "Ubah Peserta · Tanwir Qurani" };

export default async function TanwirPesertaEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MemberEditPage role="peserta" memberId={id} />;
}
