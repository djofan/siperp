import { requireTechnicianOperator } from "@/modules/teknisi/api/access";
import { DashboardView } from "@/modules/teknisi/components/operations/dashboard";
export default async function Page({ searchParams }: { searchParams: Promise<{ outlet?: string }> }) {
  const user = await requireTechnicianOperator();
  const rootHref = "/teknisi/panel";
  return <DashboardView user={user} searchParams={searchParams} rootHref={rootHref} />;
}
