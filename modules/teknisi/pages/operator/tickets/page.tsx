import { requireTechnicianOperator } from "@/modules/teknisi/api/access";
import { TicketListView } from "@/modules/teknisi/components/operations/tickets";
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; outlet?: string; page?: string }> }) {
  const user = await requireTechnicianOperator();
  const rootHref = "/teknisi/panel";
  return <TicketListView user={user} searchParams={searchParams} rootHref={rootHref} />;
}
