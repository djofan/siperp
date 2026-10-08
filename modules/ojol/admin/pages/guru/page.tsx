import { MemberListPage } from "@/modules/ojol/components/admin/MemberAdminPages";

export const metadata = { title: "Guru · Ojol Mengaji" };

export default function OjolGuruListPage({ searchParams }: { searchParams: Promise<{ q?: string; dibuat?: string }> }) {
  return <MemberListPage role="guru" searchParams={searchParams} />;
}
