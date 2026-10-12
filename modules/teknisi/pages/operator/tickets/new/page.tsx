import { requireTechnicianOperator } from "@/modules/teknisi/api/access";
import { NewTicketView } from "@/modules/teknisi/components/operations/new-ticket";
export default async function Page() {
  const user = await requireTechnicianOperator();
  const rootHref = "/teknisi/panel";
  return <NewTicketView user={user} rootHref={rootHref} />;
}
