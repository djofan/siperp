import { MemberListPage } from "@/modules/tanwir/components/admin/MemberAdminPages";

export const metadata = { title: "Guru · Tanwir Qurani" };

export default function TanwirGuruListPage({ searchParams }: { searchParams: Promise<{ q?: string; dibuat?: string }> }) {
  return <MemberListPage role="guru" searchParams={searchParams} />;
}
