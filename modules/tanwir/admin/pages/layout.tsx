import { AdminShellChrome } from "@/components/admin-shell/AdminShellChrome";
import { ModuleInactiveNotice } from "@/components/admin-shell/ModuleInactiveNotice";
import { prisma } from "@/lib/prisma";
import { requireTanwirAdmin } from "@/modules/tanwir/api/access";

export const metadata = { title: "Admin Tanwir Qurani", robots: { index: false, follow: false } };

export default async function TanwirAdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireTanwirAdmin();
  const registered = await prisma.module.findUnique({ where: { slug: "tanwir" }, select: { isActive: true } });

  return (
    <AdminShellChrome
      userName={viewer.sessionName}
      groups={[
        { items: [{ href: "/admin", label: "Core Panel" }] },
        {
          heading: "Tanwir Qurani",
          items: [
            { href: "/admin/tanwir", label: "Dashboard" },
            { href: "/admin/tanwir/guru", label: "Guru" },
            { href: "/admin/tanwir/peserta", label: "Peserta" },
            { href: "/admin/tanwir/kelompok", label: "Kelompok" },
            { href: "/admin/tanwir/tugas", label: "Monitor Tugas" },
            { href: "/admin/tanwir/anak-didik", label: "Anak Didik" },
          ],
        },
      ]}
    >
      {!registered?.isActive && <ModuleInactiveNotice />}
      {children}
    </AdminShellChrome>
  );
}
