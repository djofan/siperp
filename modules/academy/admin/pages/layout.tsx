import { requireAcademyAdmin } from "@/modules/academy/api/admin-access";
import { AdminShellChrome } from "@/components/admin-shell/AdminShellChrome";
import "@/modules/academy/components/admin/academy-admin.css";
export const metadata = { title: "Admin Academy", robots: { index: false, follow: false } };
export default async function Layout({ children }: { children: React.ReactNode }) {
  const user = await requireAcademyAdmin();
  const items = [{ href: "/admin/academy", label: "Dashboard" }, { href: "/admin/academy/pendaftaran", label: "Pendaftaran & Grup" }, { href: "/admin/academy/peserta", label: "Peserta & Progres" }, { href: "/admin/academy/program", label: "Program & Materi" }, { href: "/admin/academy/kuis", label: "Kuis" }, { href: "/admin/academy/sertifikat", label: "Sertifikat" }, { href: "/admin/academy/angkatan", label: "Angkatan" }, { href: "/admin/academy/pengaturan", label: "Pengaturan" }];
  return <AdminShellChrome userName={user.name} publicWebsiteHref="/academy" groups={[{ items: [{ href: "/admin", label: "Dashboard SIP" }] }, { heading: "Academy", items }]}><div className="academy-admin-panel">{children}</div></AdminShellChrome>;
}
