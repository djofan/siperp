import { requireTechnicianOperator } from "@/modules/teknisi/api/access";
import { TicketDetailView } from "@/modules/teknisi/components/operations/ticket-detail";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireTechnicianOperator();
  const rootHref = "/teknisi/panel";
  return <TicketDetailView user={user} params={params} rootHref={rootHref} />;
}
