import { MemberEditPage } from "@/modules/ojol/components/admin/MemberAdminPages";

export const metadata = { title: "Tambah Guru · Ojol Mengaji" };

export default function OjolGuruNewPage() {
  return <MemberEditPage role="guru" memberId={null} />;
}
