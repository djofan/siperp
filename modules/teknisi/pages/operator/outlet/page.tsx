import { requireTechnicianOperator } from "@/modules/teknisi/api/access";
import { OutletView } from "@/modules/teknisi/components/operations/outlet";
export default async function Page() {
  const user = await requireTechnicianOperator();
  return <OutletView user={user}  />;
}
