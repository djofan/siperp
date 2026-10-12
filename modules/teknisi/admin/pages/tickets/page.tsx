import { requireTechnicianUser } from "@/modules/teknisi/api/access";
import { TicketListView } from "@/modules/teknisi/components/operations/tickets";
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; outlet?: string; page?: string }> }) {
  const user = await requireTechnicianUser();
  const rootHref = "/admin/teknisi";
  return <TicketListView user={user} searchParams={searchParams} rootHref={rootHref} />;
}
