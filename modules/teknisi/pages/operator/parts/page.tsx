import { requireTechnicianOperator } from "@/modules/teknisi/api/access";
import { PartsView } from "@/modules/teknisi/components/operations/parts";
export default async function Page() {
  const user = await requireTechnicianOperator();
  return <PartsView user={user}  />;
}
