import { AdminShellChrome } from "@/components/admin-shell/AdminShellChrome";
import { requireTechnicianAdminView } from "../../api/access";
export const metadata = { title: { default: "Teknisi HP", template: "%s | Teknisi HP" }, robots: { index: false, follow: false } };
export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireTechnicianAdminView();
  const items = [{ href: "/admin/teknisi", label: "Monitoring" }, { href: "/admin/teknisi/tiket", label: "Tiket Servis" }, { href: "/admin/teknisi/outlet", label: "Outlet" }, { href: "/admin/teknisi/teknisi", label: "Teknisi" }, { href: "/admin/teknisi/sparepart", label: "Sparepart" }];
  return <AdminShellChrome userName={user.name} publicWebsiteHref="/teknisi" groups={[{ items: [{ href: "/admin", label: "Dashboard SIP" }] }, { heading: "Teknisi HP", items }]}>{children}</AdminShellChrome>;
}
