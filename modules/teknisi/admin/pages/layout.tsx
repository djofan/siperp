import { Workspace } from "../../components/Workspace";
import { requireTechnicianAdminView } from "../../api/access";
export const metadata = { title: { default: "Teknisi HP", template: "%s | Teknisi HP" }, robots: { index: false, follow: false } };
export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireTechnicianAdminView();
  return <Workspace name={user.name} subtitle="Pengelolaan seluruh outlet" root="/admin/teknisi" admin>{children}</Workspace>;
}
