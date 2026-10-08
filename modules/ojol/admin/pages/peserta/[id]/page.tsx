import { MemberEditPage } from "@/modules/ojol/components/admin/MemberAdminPages";

export const metadata = { title: "Ubah Peserta · Ojol Mengaji" };

export default async function OjolPesertaEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <MemberEditPage role="peserta" memberId={id} />;
}
