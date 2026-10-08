import { MemberEditPage } from "@/modules/tanwir/components/admin/MemberAdminPages";

export const metadata = { title: "Tambah Guru · Tanwir Qurani" };

export default function TanwirGuruNewPage() {
  return <MemberEditPage role="guru" memberId={null} />;
}
