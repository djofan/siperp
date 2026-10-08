import { MemberListPage } from "@/modules/ojol/components/admin/MemberAdminPages";

export const metadata = { title: "Peserta · Ojol Mengaji" };

export default function OjolPesertaListPage({ searchParams }: { searchParams: Promise<{ q?: string; dibuat?: string }> }) {
  return <MemberListPage role="peserta" searchParams={searchParams} />;
}
