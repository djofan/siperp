import { AdminShellChrome } from "@/components/admin-shell/AdminShellChrome";
import { requireAcademyAdmin } from "@/modules/academy/api/admin-access";
export const metadata = { title: "Admin Academy", robots: { index: false, follow: false } };
export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireAcademyAdmin();
  return <AdminShellChrome userName={user.name} groups={[
    { heading: "Academy", items: [{ href: "/admin/academy", label: "Ringkasan" }, { href: "/admin/academy/program", label: "Program & materi" }, { href: "/admin/academy/kuis", label: "Kuis" }] },
    { heading: "Navigasi", items: [{ href: "/admin", label: "Dashboard Core" }, { href: "/academy", label: "Lihat Academy" }] },
  ]}>{children}</AdminShellChrome>;
}
