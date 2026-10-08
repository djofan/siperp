import { AdminShellChrome } from "@/components/admin-shell/AdminShellChrome";
import { ModuleInactiveNotice } from "@/components/admin-shell/ModuleInactiveNotice";
import { prisma } from "@/lib/prisma";
import { requireOjolAdmin } from "@/modules/ojol/api/access";

export const metadata = { title: "Admin Ojol Mengaji", robots: { index: false, follow: false } };

export default async function OjolAdminLayout({ children }: { children: React.ReactNode }) {
  const viewer = await requireOjolAdmin();
  const registered = await prisma.module.findUnique({ where: { slug: "ojol" }, select: { isActive: true } });

  return (
    <AdminShellChrome
      userName={viewer.sessionName}
      groups={[
        { items: [{ href: "/admin", label: "Core Panel" }] },
        {
          heading: "Ojol Mengaji",
          items: [
            { href: "/admin/ojol", label: "Dashboard" },
            { href: "/admin/ojol/guru", label: "Guru" },
            { href: "/admin/ojol/peserta", label: "Peserta" },
            { href: "/admin/ojol/kelompok", label: "Kelompok" },
            { href: "/admin/ojol/tugas", label: "Monitor Tugas" },
          ],
        },
      ]}
    >
      {!registered?.isActive && <ModuleInactiveNotice />}
      {children}
    </AdminShellChrome>
  );
}
