import { MemberEditPage } from "@/modules/tanwir/components/admin/MemberAdminPages";

export const metadata = { title: "Tambah Peserta · Tanwir Qurani" };

export default function TanwirPesertaNewPage() {
  return <MemberEditPage role="peserta" memberId={null} />;
}
