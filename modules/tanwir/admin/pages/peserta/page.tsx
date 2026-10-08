import { MemberListPage } from "@/modules/tanwir/components/admin/MemberAdminPages";

export const metadata = { title: "Peserta · Tanwir Qurani" };

export default function TanwirPesertaListPage({ searchParams }: { searchParams: Promise<{ q?: string; dibuat?: string }> }) {
  return <MemberListPage role="peserta" searchParams={searchParams} />;
}
