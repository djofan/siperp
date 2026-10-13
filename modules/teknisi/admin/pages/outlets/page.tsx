import { requireTechnicianUser } from "@/modules/teknisi/api/access";
import { OutletView } from "@/modules/teknisi/components/operations/outlet";
export default async function Page() {
  const user = await requireTechnicianUser();
  return <OutletView user={user}  />;
}
