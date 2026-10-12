import { requireTechnicianUser } from "@/modules/teknisi/api/access";
import { DashboardView } from "@/modules/teknisi/components/operations/dashboard";
export default async function Page({ searchParams }: { searchParams: Promise<{ outlet?: string }> }) {
  const user = await requireTechnicianUser();
  const rootHref = "/admin/teknisi";
  return <DashboardView user={user} searchParams={searchParams} rootHref={rootHref} />;
}
