import { requireTechnicianUser } from "@/modules/teknisi/api/access";
import { TicketDetailView } from "@/modules/teknisi/components/operations/ticket-detail";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireTechnicianUser();
  const rootHref = "/admin/teknisi";
  return <TicketDetailView user={user} params={params} rootHref={rootHref} />;
}
