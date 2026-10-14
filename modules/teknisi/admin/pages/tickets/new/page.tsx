import { requireTechnicianUser } from "@/modules/teknisi/api/access";
import { NewTicketView } from "@/modules/teknisi/components/operations/new-ticket";
export default async function Page({searchParams}:{searchParams:Promise<{garansi?:string}>}) {
  const user = await requireTechnicianUser();
  const rootHref = "/admin/teknisi";
  return <NewTicketView user={user} rootHref={rootHref} searchParams={searchParams} />;
}
