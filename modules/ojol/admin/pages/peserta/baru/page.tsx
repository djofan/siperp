import { MemberEditPage } from "@/modules/ojol/components/admin/MemberAdminPages";

export const metadata = { title: "Tambah Peserta · Ojol Mengaji" };

export default function OjolPesertaNewPage() {
  return <MemberEditPage role="peserta" memberId={null} />;
}
